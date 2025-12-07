import api, { route, storage } from "@forge/api";

// Jira custom field IDs
const COVERAGE_FIELD_ID = "customfield_11969";
const PASS_RATE_FIELD_ID = "customfield_11999";

async function getConfig() {
  const config = await storage.get('testrailConfig');
  if (!config) {
    throw new Error('TestRail configuration not found. Please configure the app in Jira settings.');
  }
  return config;
}

async function fetchTestRail(apiMethod, config) {
  const { testrailUser, testrailToken, testrailSite } = config;
  
  if (!testrailUser || !testrailToken || !testrailSite) {
    throw new Error('TestRail credentials not configured. Please configure them in the app settings.');
  }

  const url = `${testrailSite}/index.php?/api/v2/${apiMethod}`;
  const authString = `${testrailUser}:${testrailToken}`;
  const authBase64 = Buffer.from(authString).toString("base64");
  const headers = { Authorization: `Basic ${authBase64}` };
  const response = await api.fetch(url, {
    method: "GET",
    headers
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error(`Error fetching ${url}:`, errText);
    throw new Error(`Failed to fetch ${url}`);
  }
  const data = await response.json();
  await new Promise(resolve => setTimeout(resolve, 333)); // 333ms delay for 180 calls/min
  return data;
}

async function fetchAll(endpoint, itemsKey, config) {
  let allItems = [];
  let offset = 0;
  const limit = 250;
  while (true) {
    const fullEndpoint = `${endpoint}&limit=${limit}&offset=${offset}`;
    const data = await fetchTestRail(fullEndpoint, config);
    const items = data[itemsKey] || [];
    allItems = allItems.concat(items);
    if (items.length < limit) break;
    offset += limit;
  }
  return allItems;
}

function calculateMetrics(obj) {
  let total = 0;
  let passed = Number(obj['passed_count']) || 0;
  let untested = Number(obj['untested_count']) || 0;
  for (const key in obj) {
    if (key.endsWith('_count')) {
      total += Number(obj[key]) || 0;
    }
  }
  let executed = total - untested;
  return { total, executed, passed };
}

export async function run() {
  try {
    console.log("Starting scheduled task");
    const config = await getConfig();
    const { coverageFieldId, passRateFieldId } = config;
    const startTime = Date.now();
    const projects = await fetchAll('get_projects', 'projects', config);
    projects.sort((a, b) => a.id - b.id);

    // Get last processed index from storage, default to 0
    let lastIndex = await storage.get('lastIndex') || 0;
    if (lastIndex >= projects.length) {
      lastIndex = 0;
    }

    // Reset accumulated percentages if starting a new full cycle
    if (lastIndex === 0) {
      await storage.set('jiraPercentages', {});
    }

    let i = lastIndex;
    const milestonePercentages = {}; // Local storage for this batch's milestone percentages

    while (i < projects.length) {
      const project = projects[i];
      const projectId = project.id;
      console.log(`Processing project ${projectId}`);
      const milestones = await fetchAll(`get_milestones/${projectId}`, 'milestones', config);
      for (const milestone of milestones) {
        if (!milestone.refs) {
          console.log(`Milestone ${milestone.id} has no refs, skipping`);
          continue;
        }
        const refs = Array.from(new Set(milestone.refs.split(',').map(key => key.trim()).filter(Boolean)));
        if (refs.length === 0) {
          console.log(`Milestone ${milestone.id} has empty refs, skipping`);
          continue;
        }
        console.log(`Processing milestone ${milestone.id} with refs: ${refs.join(", ")}`);

        // Aggregate metrics for this milestone
        let milestoneTotal = 0;
        let milestoneExecuted = 0;
        let milestonePassed = 0;

        // Fetch test plans for this milestone
        const plans = await fetchAll(`get_plans/${projectId}&milestone_id=${milestone.id}`, 'plans', config);
        for (const plan of plans) {
          console.log(`Fetching plan ${plan.id}`);
          const planDetails = await fetchTestRail(`get_plan/${plan.id}`, config);
          const metrics = calculateMetrics(planDetails);
          milestoneTotal += metrics.total;
          milestoneExecuted += metrics.executed;
          milestonePassed += metrics.passed;
        }

        // Fetch standalone runs for this milestone
        const runs = await fetchAll(`get_runs/${projectId}&milestone_id=${milestone.id}`, 'runs', config);
        for (const run of runs) {
          console.log(`Processing run ${run.id}`);
          const metrics = calculateMetrics(run);
          milestoneTotal += metrics.total;
          milestoneExecuted += metrics.executed;
          milestonePassed += metrics.passed;
        }

        // Calculate percentages for this milestone
        const milestoneCoverage = milestoneTotal > 0 ? Math.round((milestoneExecuted / milestoneTotal) * 100) : 0;
        const milestonePassRate = milestoneTotal > 0 ? Math.round((milestonePassed / milestoneTotal) * 100) : 0;

        // Associate with refs
        for (const jiraKey of refs) {
          if (!milestonePercentages[jiraKey]) {
            milestonePercentages[jiraKey] = [];
          }
          milestonePercentages[jiraKey].push({ coverage: milestoneCoverage, passRate: milestonePassRate });
        }
      }

      i++;
      const elapsed = (Date.now() - startTime) / 1000; // in seconds
      if (elapsed > 840) { // 14 minutes buffer
        break;
      }
    }

    // Accumulate this batch's milestone percentages into stored data
    let storedPercentages = await storage.get('jiraPercentages') || {};
    for (const jiraKey in milestonePercentages) {
      if (!storedPercentages[jiraKey]) {
        storedPercentages[jiraKey] = [];
      }
      storedPercentages[jiraKey] = storedPercentages[jiraKey].concat(milestonePercentages[jiraKey]);
    }
    await storage.set('jiraPercentages', storedPercentages);

    // Update Jira issues using averaged percentages
    for (const jiraKey in storedPercentages) {
      const percentages = storedPercentages[jiraKey];
      if (percentages.length > 0) {
        const avgCoverage = Math.round(percentages.reduce((sum, p) => sum + p.coverage, 0) / percentages.length);
        const avgPassRate = Math.round(percentages.reduce((sum, p) => sum + p.passRate, 0) / percentages.length);
        console.log(`Updating ${jiraKey} with coverage: ${avgCoverage}%, pass rate: ${avgPassRate}%`);
        try {
          const updateResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${jiraKey}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              fields: {
                [coverageFieldId]: avgCoverage,
                [passRateFieldId]: avgPassRate
              }
            })
          });
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`Failed to update ${jiraKey}:`, errorText);
          } else {
            console.log(`Successfully updated ${jiraKey}`);
          }
        } catch (error) {
          console.error(`Error updating ${jiraKey}:`, error);
        }
      }
    }

    // Save state for next run
    await storage.set('lastIndex', i);
    if (i >= projects.length) {
      await storage.set('lastIndex', 0);
    }

    console.log("Scheduled task completed");
    return { statusCode: 200, body: "Scheduled task completed successfully" };
  } catch (error) {
    console.error("Scheduled task failed:", error);
    return { statusCode: 500, body: "Error processing scheduled task" };
  }
}