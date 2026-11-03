// Offline production-browser fixture. Run with playwright-cli run-code.
// Replace __STAGE__ with before or after in the runner, never in production.
async (page) => {
  const stage = '__STAGE__';
  const checks = [];
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  const fixtures = {
    tables: '# PDF table regression\n\nFictional data; no live recommendations.\n\n## Wide table\n\nAll six columns and their end markers must remain visible.\n\n' +
      '| Code | Route | Stay | Schedule | Allowance | Confirmation |\n| --- | --- | --- | --- | --- | --- |\n' +
      Array.from({length:8},(_,i) => `| R${i+1} | DelhiToTokyoTransferWithoutSpaces${i+1} | Tokyo<br>Hakone<BR/>Kyoto<br />Osaka | Morning train and afternoon walking tour | INR ${1000+i} | ROWEND${i+1} |`).join('\n') +
      '\n\n## Long row\n\nA deliberately long cell tests wrapping across page boundaries.\n\n| Item | Detail |\n| --- | --- |\n| LONGROW | ' +
      Array.from({length:70},(_,i)=>`Segment ${i+1}: allow time for rest, food and transport.`).join(' ') + ' LONGROWEND |\n\n' +
      '## Safe Markdown\n\n| Kind | Example |\n| --- | --- |\n| Breaks | Alpha<br>Beta<BR/>Gamma<br />Delta |\n| Inline code | `<br>` |\n| HTML | <img src="invalid" onerror="window.__unsafe=true"> |\n\n```html\n<br>\n```\n\n**TABLEFIXTUREEND**',
    itinerary: '# Seven-day PDF fixture\n\nAn offline schedule, not a generated travel recommendation.\n\n' +
      Array.from({length:7},(_,i) => `## Day ${i+1}\n\nDAYSTART${i+1}. ` +
        'Begin with a relaxed morning walk, then leave time for lunch and a local museum. Return to the hotel before dinner. '.repeat(4) +
        '\n\n### Daily schedule\n\nKeep the transfers compatible with the day activities.\n\n| Time | Plan | Cost estimate |\n| --- | --- | --- |\n| Morning | Walk and breakfast | INR 800 |\n| Afternoon | Museum and garden | INR 1200 |\n| Evening | Dinner near hotel | INR 900 |\n\n' +
        `DAYEND${i+1}. Accommodation and transport are illustrative estimates.\n\n`).join('') +
      '## Final note\n\n**ITINERARYFIXTUREEND**. All seven days must be present exactly once.',
  };
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/health',r=>r.fulfill({json:{status:'ok'}}));
  let markdown = '';
  const response = () => ({success:true,thread_id:'pdf-presentation-fixture',answer:markdown,
    itinerary:markdown,requires_approval:false,guardrail_allowed:true,selected_agents:[],
    trip_constraints:{},supervisor_reasoning:'Offline PDF fixture.',llm_calls:0});
  await page.route('**/api/travel',r=>r.fulfill({json:response()}));
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5175');
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  const results = [];
  for (const [name, content] of Object.entries(fixtures)) {
    markdown = content;
    const reset = page.getByRole('button',{name:'New session',exact:true});
    if (await reset.count()) await reset.click();
    await page.getByRole('textbox',{name:'Where do you want to go?'}).fill('Offline PDF fixture');
    await page.getByRole('button',{name:'Generate draft',exact:true}).click();
    await page.getByRole('heading',{name:'Your AI travel plan',exact:true}).waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1000);
    await page.getByRole('button',{name:'Copy',exact:true}).click();
    check(await page.evaluate(()=>navigator.clipboard.readText()) === content, name+' copy preserves complete Markdown');
    if (name === 'tables' && stage === 'after') {
      check(await page.locator('.md td br').count() === 27,'bare table breaks rendered safely');
      check(await page.locator('.md td code').innerText() === '<br>','inline code preserved');
      check(await page.locator('.md pre code').innerText() === '<br>\n','fenced code preserved');
      check(await page.locator('.md img').count() === 0 && !(await page.evaluate(()=>window.__unsafe)),'arbitrary HTML remains escaped');
      check((await page.locator('.md').innerText()).includes('<img src="invalid"'),'escaped HTML remains visible');
    }
    for (const theme of stage === 'before' ? ['light'] : ['light','dark']) {
      await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
      if (stage === 'after') {
        await page.evaluate(() => {
          window.__pdfProbe = null;
          const expected = document.querySelector('.pdf-root .md').textContent;
          const observer = new MutationObserver(() => {
            const root = document.querySelector('.html2pdf__container .pdf-export');
            if (!root) return;
            const box = root.getBoundingClientRect();
            window.__pdfProbe = {
              contentPreserved: root.querySelector('.md').textContent.replace(/\s/g,'') === expected.replace(/\s/g,''),
              tablesFit: [...root.querySelectorAll('table')].every(table => {
                const rect = table.getBoundingClientRect();
                return rect.left >= box.left - 1 && rect.right <= box.right + 1;
              }),
            };
            observer.disconnect();
          });
          observer.observe(document.body,{childList:true,subtree:true});
        });
      }
      const downloadReady = page.waitForEvent('download');
      await page.getByRole('button',{name:'Download PDF',exact:true}).click();
      const download = await downloadReady;
      const path = `output/playwright/pdf-presentation/${stage}-${name}-${theme}.pdf`;
      await download.saveAs(path);
      if (stage === 'after') {
        const probe = await page.evaluate(()=>window.__pdfProbe);
        check(probe?.contentPreserved, name+' '+theme+' export clone preserves non-whitespace text in order');
        check(probe?.tablesFit, name+' '+theme+' tables fit printable width');
        check(await page.locator('.pdf-root.pdf-export').count() === 0,'PDF styles do not affect screen layout');
      }
      results.push({name,theme,path});
    }
  }
  await page.unrouteAll({behavior:'wait'});
  return {stage,checks,results,scope:'Synthetic fixtures; no live database or providers'};
}
