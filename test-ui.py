import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':1100})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:4200',wait_until='networkidle')
  await page.get_by_role('button',name='Pause',exact=True).click()
  await page.get_by_role('button',name='Reset both cases').click()
  assert await page.locator('.time').inner_text()=='0 ps'
  await page.get_by_role('button',name='Advance 1 ps').click()
  assert await page.locator('.time').inner_text()=='1 ps'
  await page.get_by_role('slider',name='Initial temperature').fill('600')
  assert await page.locator('.time').inner_text()=='0 ps'
  assert '600' in await page.locator('.metrics').first.inner_text()
  await page.locator('.switch-label').click()
  assert await page.get_by_role('checkbox',name='Hold temperature',exact=True).is_checked()
  assert 'Thermostat adds lost energy' in await page.locator('.energy-control').inner_text()
  await page.get_by_role('checkbox',name='Show velocity trails').uncheck()
  for _ in range(21):await page.get_by_role('button',name='Advance 1 ps').click()
  assert '—' not in await page.locator('.metrics').first.inner_text()
  async with page.expect_download() as download:
   await page.get_by_role('button',name='Export live CSV').click()
  downloaded=await download.value
  await downloaded.save_as('/home/user/live-ui-test.csv')
  await page.get_by_role('button',name='Model limitations').click()
  assert await page.get_by_text('Dissipative is not synonymous with real gas.').is_visible()
  await page.get_by_role('button',name='Physical mechanisms').click()
  assert await page.get_by_text('A three-dimensional distribution.').is_visible()
  await page.get_by_role('button',name='Key observations').click()
  await page.get_by_role('button',name='300 K',exact=True).click()
  await page.get_by_role('button',name='Pause',exact=True).click()
  assert '300' in await page.locator('.metrics').first.inner_text()
  for name in ['analysis-report.md','simulation-prompt.md','recorded-measurements.csv','reproducibility-kit.zip']:
   response=await page.request.get('http://localhost:4200/downloads/'+name)
   assert response.status==200,name
  await page.screenshot(path='/home/user/lab-desktop-final.png',full_page=True)
  await page.set_viewport_size({'width':390,'height':844})
  await page.screenshot(path='/home/user/lab-mobile-final.png',full_page=True)
  overflow=await page.evaluate('document.documentElement.scrollWidth>window.innerWidth')
  assert not overflow,'Mobile horizontal overflow'
  assert not errors,errors
  Path('/home/user/molecular-lab/ui-checks.json').write_text(json.dumps({'passed':True,'tested':['pause','reset','step','temperature','thermostat','trails','live CSV download','analysis tabs','presets','all artifact links','390px responsive layout'],'browserErrors':errors,'mobileOverflow':overflow},indent=2))
  await browser.close()
  print('All browser checks passed')

asyncio.run(main())