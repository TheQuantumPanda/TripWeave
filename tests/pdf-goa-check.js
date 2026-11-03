// Offline real-output regression. Run via playwright-cli run-code, substituting
// __GOA_MARKDOWN__ (JSON string from fixtures/goa-delhi-3-day.md),
// __BASE_URL__ and __STAGE__ (before/after). No provider responses are fetched.
async (page) => {
  const markdown = '__GOA_MARKDOWN__';
  const baseURL = '__BASE_URL__';
  const stage = '__STAGE__';
  const output = 'output/playwright/pdf-static-import';
  const checks = [], results = [], browserErrors = [];
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  const onPageError = error => browserErrors.push(error.message);
  page.on('pageerror', onPageError);

  async function prepare(theme, isDraft, blockScripts = false) {
    await page.goto('about:blank');
    await page.unrouteAll({behavior:'wait'});
    await page.route('**/health', r => r.fulfill({json:{status:'ok'}}));
    await page.route('**/api/travel', r => r.fulfill({json:{success:true,
      thread_id:'offline-goa-export-fixture', answer:isDraft ? '' : markdown,
      itinerary:markdown, requires_approval:isDraft, guardrail_allowed:true,
      selected_agents:[], supervisor_reasoning:'Offline replay of supplied output.',
      trip_constraints:{}, llm_calls:0}}));
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(baseURL);
    const toggle = page.getByRole('button',{name:`Switch to ${theme} theme`,exact:true});
    if (await toggle.count()) await toggle.click();
    await page.getByRole('textbox',{name:'Where do you want to go?'}).fill('Offline Goa export fixture');
    await page.getByRole('button',{name:'Generate draft',exact:true}).click();
    await page.getByRole('heading',{name:isDraft ? 'Draft travel plan' : 'Your AI travel plan',exact:true}).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    check(await page.locator('.md h2').count() === 8, theme+' all eight sections displayed');
    check(await page.locator('.md table').count() === 9, theme+' all nine tables displayed');
    check(await page.locator('.md input[type=checkbox]').count() === 10, theme+' checklist retained');
    const closing = await page.locator('.md > p').last().innerText();
    check(closing.startsWith('With a ₹1,500 cushion,') && closing.endsWith('₹30,000 limit.'), theme+' complete closing paragraph displayed');
    const requests = [];
    await page.route('**/*', async route => {
      if (route.request().resourceType() === 'script') {
        requests.push(route.request().url());
        if (blockScripts) return route.fulfill({status:404,body:''});
      }
      return route.fallback();
    });
    return requests;
  }

  async function download(theme, isDraft, suffix = '') {
    await page.evaluate(() => {
      window.__goaPdfProbe = null;
      const expected = document.querySelector('.pdf-root .md').textContent;
      const headings = [...document.querySelectorAll('.pdf-root .md h2')].map(h => h.textContent);
      const observer = new MutationObserver(() => {
        const root = document.querySelector('.html2pdf__container .pdf-export');
        if (!root) return;
        const bounds = root.getBoundingClientRect();
        window.__goaPdfProbe = {
          completeText:root.querySelector('.md').textContent.replace(/\s/g,'') === expected.replace(/\s/g,''),
          headingsPreserved:JSON.stringify([...root.querySelectorAll('.md h2')].map(h => h.textContent)) === JSON.stringify(headings),
          tablesFit:[...root.querySelectorAll('table')].every(t => {const r=t.getBoundingClientRect();return r.left>=bounds.left-1 && r.right<=bounds.right+1;}),
          whiteBackground:getComputedStyle(root).backgroundColor === 'rgb(255, 255, 255)',
        };
        observer.disconnect();
      });
      observer.observe(document.body,{childList:true,subtree:true});
    });
    const ready = page.waitForEvent('download');
    await page.getByRole('button',{name:'Download PDF',exact:true}).click();
    const pdf = await ready;
    const kind = isDraft ? 'draft' : 'final';
    check(pdf.suggestedFilename() === (isDraft ? 'tripweave-draft-plan.pdf' : 'tripweave-travel-plan.pdf'), kind+' filename unchanged');
    const path = `${output}/${stage}-goa-${kind}-${theme}${suffix}.pdf`;
    await pdf.saveAs(path);
    const probe = await page.evaluate(() => window.__goaPdfProbe);
    for (const key of ['completeText','headingsPreserved','tablesFit','whiteBackground']) check(probe?.[key],kind+' '+theme+' '+key);
    check(await page.locator('.pdf-light,.pdf-export').count() === 0, kind+' '+theme+' export-only classes cleaned up');
    check(await page.getByRole('button',{name:'Download PDF',exact:true}).isEnabled(),kind+' '+theme+' export button restored');
    check(await page.getByRole('alert').count() === 0,kind+' '+theme+' no error alert');
    check(await page.evaluate(t => document.documentElement.classList.contains(t),theme),kind+' '+theme+' screen theme preserved');
    results.push({kind,theme,path,probe});
  }

  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  for (const theme of ['light','dark']) {
    for (const isDraft of [true,false]) {
      const requests = await prepare(theme,isDraft);
      await page.getByRole('button',{name:'Copy',exact:true}).click();
      check(await page.evaluate(() => navigator.clipboard.readText()) === markdown,theme+' clipboard preserves exact Markdown');
      await download(theme,isDraft);
      if (stage === 'after') check(requests.length === 0,theme+' PDF export makes no late JavaScript requests');
    }
    const requests = await prepare(theme,true,true);
    if (stage === 'before') {
      await page.getByRole('button',{name:'Download PDF',exact:true}).click();
      await page.getByRole('alert').waitFor();
      check((await page.getByRole('alert').innerText()).includes('Could not generate the PDF.'),theme+' missing lazy chunk reproduces original error');
      check(requests.length > 0,theme+' original exporter requested unavailable chunk');
    } else {
      await download(theme,true,'-scripts-unavailable');
      check(requests.length === 0,theme+' loaded app exports with subsequent script requests blocked');
    }
  }
  if (stage === 'after') {
    await prepare('dark',true);
    await page.evaluate(() => {
      window.__originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = () => { throw new DOMException('Offline regression fixture','SecurityError'); };
    });
    await page.getByRole('button',{name:'Download PDF',exact:true}).click();
    await page.getByRole('alert').waitFor();
    check((await page.getByRole('alert').innerText()).includes('Could not generate the PDF.'),'renderer failure still uses existing error handling');
    check(await page.getByRole('button',{name:'Download PDF',exact:true}).isEnabled(),'renderer failure restores button');
    check(await page.locator('.pdf-root.pdf-light').count() === 0,'renderer failure removes screen light override');
    check((await page.locator('.md > p').last().innerText()).endsWith('₹30,000 limit.'),'renderer failure retains complete draft');
    await page.evaluate(() => {HTMLCanvasElement.prototype.toDataURL = window.__originalToDataURL;});
    await page.getByRole('button',{name:'Dismiss',exact:true}).click();
    await download('dark',true,'-retry');
  }
  check(browserErrors.length === 0,'no unexpected browser page errors');
  await page.goto('about:blank');
  await page.unrouteAll({behavior:'wait'});
  page.off('pageerror',onPageError);
  return {stage,checks,results,browserErrors,scope:'Offline supplied Markdown; no live providers'};
}
