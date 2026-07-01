// V5: No reload - inject Audio hook via evaluate, use getByRole('textbox').fill()
async (page) => {
  const ctx = page.context();

  async function tr(word) {
    try {
      const u = 'https://dict.youdao.com/jsonapi?q=' + encodeURIComponent(word) + '&le=eng&dicts=%7B%22count%22%3A99%2C%22dicts%22%3A%5B%5B%22ec%22%5D%5D%7D';
      const r = await ctx.request.get(u);
      const d = await r.json();
      const raw = d?.ec?.word?.[0]?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || '';
      return raw.replace(/^[a-z]+\.\s*/i, '').split('；')[0].split('，')[0].trim();
    } catch(e) { return null; }
  }

  // Inject Audio hook WITHOUT reload - works for current page session
  await page.evaluate(() => {
    const OrigAudio = window.Audio;
    window.Audio = function(src) {
      window.__word = (src || '').match(/audio=([^&]+)/)?.[1] || null;
      return new OrigAudio(src);
    };
  });

  let ok = 0;

  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1200);

    let word = await page.evaluate(() => {
      const w = window.__word;
      window.__word = null;
      if (w) return w;
      const inp = document.querySelector('textarea, input[type="text"]');
      let el = inp;
      while (el && el !== document.body) {
        const children = el.parentElement ? Array.from(el.parentElement.children) : [];
        for (const child of children) {
          const t = (child.textContent || '').trim();
          if (/^[a-zA-Z][a-zA-Z-]*[a-zA-Z]$/.test(t)) return t;
        }
        el = el.parentElement;
      }
      return null;
    });

    if (!word) {
      try {
        await page.locator('button').filter({ has: page.locator('img') }).first().click({ timeout: 3000 });
        await page.waitForTimeout(3000);
        word = await page.evaluate(() => {
          const w = window.__word;
          window.__word = null;
          return w;
        });
        if (!word) {
          word = await page.evaluate(() => {
            const inp = document.querySelector('textarea, input[type="text"]');
            let el = inp;
            while (el && el !== document.body) {
              const children = el.parentElement ? Array.from(el.parentElement.children) : [];
              for (const child of children) {
                const t = (child.textContent || '').trim();
                if (/^[a-zA-Z][a-zA-Z-]*[a-zA-Z]$/.test(t)) return t;
              }
              el = el.parentElement;
            }
            return null;
          });
        }
      } catch(e) {}
    }

    console.log('Q' + (i+1) + ': ' + (word || '??'));

    if (word) {
      const translation = await tr(word);
      if (translation) {
        await page.getByRole('textbox').fill(translation);
        ok++;
        console.log('  -> ' + translation);
      }
    }

    try {
      await page.getByRole('button', { name: /下一题|下一步/ }).click({ timeout: 2000 });
    } catch(e) {}
    await page.waitForTimeout(700);
  }

  return 'OK: ' + ok + '/40';
}