// Browser-only synthetic API responses. Never loaded by the application.
// Run through playwright-cli run-code; see docs/verification.md.
async (page) => {
  const checks = [];
  const unexpectedErrors = [];
  const recordConsole = message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) unexpectedErrors.push(message.text());
  };
  const recordPageError = error => unexpectedErrors.push(error.message);
  page.on('console', recordConsole);
  page.on('pageerror', recordPageError);
  const capture = async path => {
    await page.waitForTimeout(1100); // Let existing panel entry and scroll animations settle.
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path,fullPage:true});
  };
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  const base = { success: true, thread_id: 'ui-check-thread', answer: '', requires_approval: true, approval_request: 'Review this test itinerary.', flight_results: '', hotel_results: '', weather_results: '', budget_results: '', itinerary: '## Test itinerary\n\nA fictional trip used only for browser verification.\n\n| Day | Activity |\n| --- | --- |\n| 1 | Explore the old town |', selected_agents: ['flight_agent','hotel_agent','weather_agent','budget_agent','itinerary_agent'], trip_constraints: {}, supervisor_reasoning: 'Browser fixture: five selected specialists.', guardrail_allowed: true, guardrail_reason: '', approved: null, human_feedback: '', llm_calls: 7 };
  const requests = [];
  let mode = 'draft';
  await page.route('**/health', route => route.fulfill({json:{status:'ok'}}));
  await page.route('**/api/travel', async route => {
    requests.push({url:'travel', body:route.request().postDataJSON()});
    await new Promise(resolve => setTimeout(resolve, 600));
    if(mode === 'error') return route.fulfill({status:500,json:{success:false,error:'Browser fixture: provider unavailable.'}});
    return route.fulfill({json: mode === 'blocked' ? {...base,requires_approval:false,guardrail_allowed:false,guardrail_reason:'Browser fixture: travel requests only.',answer:'Browser fixture: travel requests only.',selected_agents:[]} : base});
  });
  await page.route('**/api/travel/approve', route => {
    const body = route.request().postDataJSON();
    requests.push({url:'approve',body});
    if(mode === 'approval-error') return route.fulfill({status:500,json:{success:false,error:'Browser fixture: approval temporarily unavailable.'}});
    return route.fulfill({json:{...base,requires_approval:false,approved:body.approved,human_feedback:body.feedback,answer:'## Test final itinerary\n\n'+(body.approved ? 'Approved test plan.' : 'Revised test plan.')+'\n\n| Category | Example estimate |\n| --- | --- |\n| Local transport | Fictional estimate only |'}});
  });
  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(() => {localStorage.removeItem('voyagen_thread_id'); localStorage.setItem('voyagen_theme','light');});
  await page.reload();
  await page.getByText('API online',{exact:true}).waitFor();
  const composer = page.locator('main textarea').first();
  check(await page.getByRole('button',{name:'Generate draft',exact:true}).isDisabled(),'empty input disables submit');
  for(const title of ['Japan · 7 days','Dubai · 5 days','Thailand · 6 days','Vietnam · 8 days','Himachal · 5 days','Global flights']) {
    await page.getByRole('button',{name:new RegExp(title)}).click();
    check((await composer.inputValue()).length > 0,title+' quick prompt is usable');
  }
  await page.getByRole('button',{name:/Japan · 7 days/}).click();
  check((await composer.inputValue()).includes('Japan trip from Delhi'),'quick prompt fills original text');
  await composer.press('Control+Enter');
  await page.getByText('Building your plan',{exact:true}).waitFor();
  checks.push('keyboard submit and loading');
  await page.getByRole('heading',{name:'Draft travel plan',exact:true}).waitFor();
  await capture('output/playwright/tripweave-draft-fixture.png');
  check(await composer.isDisabled(),'composer locks during review');
  check(await page.getByRole('button',{name:'Revise & Finalize',exact:true}).isDisabled(),'empty feedback disables revise');
  check(await page.getByText('Your feedback will be applied to the itinerary, and the revised version will become your final plan.',{exact:true}).isVisible(),'revision explains finalization');
  check(requests[0].body.message.includes('Japan') && requests[0].body.thread_id === null,'original plan request contract');
  await page.getByRole('button',{name:'Switch to dark theme',exact:true}).click();
  await capture('output/playwright/tripweave-dark-review-fixture.png');
  const draftDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Download PDF',exact:true}).click();
  const draftDownload = await draftDownloadPromise;
  await draftDownload.saveAs('output/playwright/' + draftDownload.suggestedFilename());
  check(draftDownload.suggestedFilename() === 'tripweave-draft-plan.pdf','draft PDF downloads from dark theme');
  await page.getByRole('button',{name:'Switch to light theme',exact:true}).click();
  await page.getByRole('button',{name:'Approve & generate final',exact:true}).click();
  await page.getByRole('heading',{name:'Your AI travel plan',exact:true}).waitFor();
  check(requests.at(-1).body.approved === true && requests.at(-1).body.thread_id === 'ui-check-thread','approval request and final state');
  check(!(await composer.isDisabled()),'composer unlocks after final');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button',{name:'Copy',exact:true}).click();
  check((await page.evaluate(() => navigator.clipboard.readText())).includes('Approved test plan.'),'copy places original markdown on clipboard');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Download PDF',exact:true}).click();
  const download = await downloadPromise;
  await download.saveAs('output/playwright/' + download.suggestedFilename());
  check(download.suggestedFilename() === 'tripweave-travel-plan.pdf','PDF download uses TripWeave name');
  await capture('output/playwright/tripweave-final-fixture.png');
  await page.getByRole('button',{name:'New session',exact:true}).click();
  check(await page.evaluate(() => localStorage.getItem('voyagen_thread_id')) === null,'reset clears thread');
  await page.getByRole('button',{name:'Generate draft',exact:true}).click();
  await page.getByRole('heading',{name:'Draft travel plan',exact:true}).waitFor();
  await page.getByRole('button',{name:'Reduce the hotel cost and add one free day.',exact:true}).click();
  await page.getByRole('button',{name:'Revise & Finalize',exact:true}).click();
  await page.getByText('Revised test plan.',{exact:true}).waitFor();
  check(await page.getByRole('heading',{name:'Your AI travel plan',exact:true}).isVisible() && await page.getByRole('button',{name:'Revise & Finalize',exact:true}).count() === 0,'revision completes without another approval cycle');
  check(requests.at(-1).body.approved === false && requests.at(-1).body.feedback === 'Reduce the hotel cost and add one free day.','revision preset and request contract');
  await page.getByRole('button',{name:'New session',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Generate draft',exact:true}).click();
  await page.getByRole('heading',{name:'Draft travel plan',exact:true}).waitFor();
  check(await page.getByRole('button',{name:'New session',exact:true}).isVisible(),'reset remains accessible on mobile');
  await capture('output/playwright/tripweave-mobile-review-fixture.png');
  mode = 'approval-error';
  await page.getByRole('button',{name:'Approve & generate final',exact:true}).click();
  await page.getByRole('alert').waitFor();
  await page.getByRole('heading',{name:'Review the draft itinerary',exact:true}).waitFor();
  check(await composer.isDisabled(),'failed approval retains draft and review lock');
  await page.getByRole('button',{name:'Dismiss',exact:true}).click();
  mode = 'draft';
  await page.getByRole('button',{name:'Approve & generate final',exact:true}).click();
  await page.getByRole('heading',{name:'Your AI travel plan',exact:true}).waitFor();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),'mobile result has no horizontal page overflow');
  await page.getByRole('button',{name:'New session',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  mode = 'blocked';
  await page.getByRole('button',{name:'Generate draft',exact:true}).click();
  await page.getByText('Guardrail blocked',{exact:true}).waitFor();
  check(await page.getByRole('button',{name:'Approve & generate final',exact:true}).count() === 0,'blocked result has no approval');
  mode = 'error';
  await page.getByRole('button',{name:'Generate draft',exact:true}).click();
  await page.getByRole('alert').waitFor();
  await capture('output/playwright/tripweave-error-fixture.png');
  check((await page.getByRole('alert').innerText()).includes('provider unavailable'),'server error shown');
  await page.getByRole('button',{name:'Dismiss',exact:true}).click();
  await page.getByRole('alert').waitFor({state:'detached'});
  checks.push('error dismisses');
  for (const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),width+'px viewport has no page overflow');
  }
  await page.getByRole('button',{name:'Switch to dark theme',exact:true}).click();
  check(await page.evaluate(() => document.documentElement.classList.contains('dark')),'dark theme toggle');
  await page.reload();
  check(await page.evaluate(() => document.documentElement.classList.contains('dark')),'theme survives reload');
  await page.getByRole('button',{name:'Switch to light theme',exact:true}).click();
  check(unexpectedErrors.length === 0,'no unexpected browser console or page errors');
  page.off('console',recordConsole);
  page.off('pageerror',recordPageError);
  await page.unrouteAll({behavior:'wait'});
  return {kind:'BROWSER-ONLY SYNTHETIC CONTRACT CHECKS; NO LIVE PROVIDERS',checks,requests:requests.length};
}
