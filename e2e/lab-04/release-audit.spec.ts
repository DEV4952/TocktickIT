import { test, expect, login, openTicket, capture } from './fixtures';
import type { Page, TestInfo } from '@playwright/test';
import path from 'node:path';
const viewports = [{name:'mobile-375x812',width:375,height:812},{name:'tablet-768x1024',width:768,height:1024},{name:'desktop-1440x900',width:1440,height:900}];
async function layout(page: Page) {
 const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
 expect(overflow, 'document must reflow without horizontal scrolling').toBe(false);
}
async function accessible(page: Page, info: TestInfo, name: string, selector?: string) {
 await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});
 const violations = await page.evaluate(async selector => {
  const axe = (window as any).axe;
  const result = await axe.run(selector || document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
  return result.violations.map((v:any)=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));
 }, selector);
 await info.attach(name+'-axe', {body:JSON.stringify(violations,null,2),contentType:'application/json'});
 expect(violations, name+' WCAG automated findings').toEqual([]);
}
for(const viewport of viewports) test(`${viewport.name}: visual, keyboard, accessibility and real conflict`, async({data,roles},info)=>{
 const staff=roles.staff, requester=roles.requester;
 const runtime:string[]=[]; const responses:string[]=[]; const failedRequests:string[]=[];
 for(const page of [staff,requester]) {
  await page.setViewportSize(viewport);
  page.on('requestfailed',request=>failedRequests.push(`${request.failure()?.errorText} ${new URL(request.url()).pathname}`));
  page.on('pageerror',error=>runtime.push(error.message));
  page.on('console',message=>{if(message.type()==='error') runtime.push(message.text()+' @ '+message.location().url)});
  page.on('response',response=>{if(response.status()>=400) responses.push(`${response.status()} ${new URL(response.url()).pathname}`)});
 }
 await login(requester,data.requester,data.password);
 await expect(requester.getByText('No recent tickets to display.',{exact:false})).toBeVisible();
 await layout(requester); await accessible(requester,info,'requester-empty');
 await capture(requester,info,`requester-${viewport.name}-empty`,data.prefix);
 data.staff = await data.p.user.update({where:{id:data.staff.id},data:{name:'Synthetic long performer '+ 'Alexander '.repeat(8)}});
 const ticket = await data.ticket('Long title '+ 'network-restoration-'.repeat(4),'OPEN',data.staff.id,data.requester,new Date('2090-01-01T00:00:00Z'),'HIGH');
 await data.ticket('Awaiting diagnostic log '+ 'response-needed-'.repeat(3),'WAITING_FOR_REQUESTER',null,data.requester,new Date('2090-01-01T00:00:01Z'));
 for(const [index,status] of ['RECORDED','IN_PROGRESS'].entries()) await data.p.actionTaken.create({data:{ticketId:ticket.id,performedById:data.staff.id,assigneeId:data.staff.id,status:status as 'RECORDED'|'IN_PROGRESS',description:`${data.prefix} action ${index} `+'longunbrokencontent'.repeat(20),result:'Verified restoration '+ 'successful '.repeat(20),followUpRequired:true,followUpNote:'Monitor recovery '+ 'follow-up '.repeat(20),attachmentNotes:'Synthetic-log-reference-'.repeat(20)}});
 await requester.reload(); await expect(requester.getByRole('link',{name:'My Open Tickets: 2 tickets',exact:true})).toBeVisible();
 await layout(requester); await accessible(requester,info,'requester-populated'); await capture(requester,info,`requester-${viewport.name}-populated`,data.prefix);
 await login(staff,data.staff,data.password);
 await expect(staff.locator('.dashboard')).toHaveAttribute('aria-busy','false');
 await layout(staff); await accessible(staff,info,'staff-populated'); await capture(staff,info,`staff-${viewport.name}-populated`,data.prefix);
 // Real request is paused, then continued; loading is not a mocked successful API.
 let release!:()=>void; const gate=new Promise<void>(resolve=>release=resolve);
 await staff.route('**/api/dashboard/staff',async route=>{await gate;await route.continue()});
 try {
  await staff.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(staff.locator('.dashboard')).toHaveAttribute('aria-busy','true');
  await layout(staff); await capture(staff,info,`staff-${viewport.name}-loading`,data.prefix);
 } finally { release(); }
 await expect(staff.locator('.dashboard')).toHaveAttribute('aria-busy','false'); await staff.unroute('**/api/dashboard/staff');
 // Controlled failure injection verifies visible safe failure and explicit retry.
 for(const [page,role] of [[staff,'staff'],[requester,'requester']] as const) {
  const pattern='**/api/dashboard/'+role;
  await page.route(pattern,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Controlled QA service outage'})}));
  await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Retry dashboard'})).toBeVisible();
  await layout(page); await capture(page,info,`${role}-${viewport.name}-safe-failure`,data.prefix);
  await page.unroute(pattern); await page.getByRole('button',{name:'Retry dashboard'}).click();
  await expect(page.locator('.dashboard')).toHaveAttribute('aria-busy','false');
  await expect(page.getByRole('button',{name:'Retry dashboard'})).toHaveCount(0);
 }
 // Scope checks run against real navigation/authorization.
 await requester.goto('/staff/queue'); await expect(requester.getByRole('alert')).toContainText('permission');
 await layout(requester); await capture(requester,info,`requester-${viewport.name}-forbidden`,data.prefix);
 const emptyTicket=await data.ticket('Empty actions','OPEN',data.staff.id,data.other);
 await openTicket(staff,emptyTicket.id); await expect(staff.getByText('No actions recorded yet.',{exact:true})).toBeVisible();
 await capture(staff,info,`actions-${viewport.name}-empty`,data.prefix);
 await openTicket(staff,ticket.id); await expect(staff.locator('.actions-entry')).toHaveCount(2);
 await layout(staff); await accessible(staff,info,'actions-list'); await capture(staff,info,`actions-${viewport.name}-list`,data.prefix);
 const add=staff.getByRole('button',{name:'Add Action',exact:true}); await add.focus(); await staff.keyboard.press('Enter');
 const dialog=staff.getByRole('dialog',{name:'Add Action Taken'});
 await expect(dialog.getByLabel('Assigned To')).toBeEnabled();
 await dialog.getByLabel('Assigned To').focus();
 await capture(staff,info,`actions-${viewport.name}-keyboard-focus`,data.prefix,".actions-modal");
 await staff.keyboard.press('Tab'); await expect(dialog.getByLabel('Action Date/Time')).toBeFocused();
 await dialog.getByRole('button',{name:'Save Action',exact:true}).focus(); await staff.keyboard.press('Tab'); await expect(dialog.getByRole('button',{name:'Close action form'})).toBeFocused();
 await staff.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button',{name:'Save Action',exact:true})).toBeFocused();
 await staff.keyboard.press('Enter'); await expect(dialog.getByRole('alert')).toContainText('Description');
 await layout(staff); await accessible(staff,info,'create-modal','.actions-modal'); await capture(staff,info,`actions-${viewport.name}-create-validation`,data.prefix,".actions-modal");
 await staff.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(add).toBeFocused();
 await staff.locator('.actions-entry').first().getByRole('button',{name:/^Edit action:/}).click();
 await expect(staff.getByRole('dialog',{name:'Edit Action Taken'})).toBeVisible();
 await layout(staff); await capture(staff,info,`actions-${viewport.name}-edit`,data.prefix,".actions-modal");
 const attachmentField=staff.getByRole('dialog').getByLabel('Attachment Notes');
 await attachmentField.focus();
 // Native focus only guarantees the caret is visible. Audit the actual scroll
 // state as well, so the complete textarea and its border clear the footer.
 await attachmentField.scrollIntoViewIfNeeded();
 const fieldBox=await attachmentField.boundingBox(), footerBox=await staff.locator('.actions-modal-footer').boundingBox();
 expect(fieldBox!.y+fieldBox!.height).toBeLessThanOrEqual(footerBox!.y+1);
 await staff.keyboard.press('Tab'); await expect(staff.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
 await capture(staff,info,`actions-${viewport.name}-edit-scrolled`,data.prefix,".actions-modal");
 await staff.keyboard.press('Escape');
 // Stale the loaded version using a separate DB connection, then exercise real 409 UI.
 await data.p.ticket.update({where:{id:ticket.id},data:{updatedAt:new Date(Date.now()+1000)}});
 await staff.getByLabel('Status Transition').selectOption('RESOLVED');
 await expect(staff.getByTestId('triage-error-banner')).toContainText('Another update occurred. Your change was not saved.');
 await expect(staff.getByLabel('Status Transition')).toBeDisabled(); await layout(staff);
 await capture(staff,info,`actions-${viewport.name}-workflow-conflict`,data.prefix);
 await staff.getByRole('button',{name:'Load latest ticket',exact:true}).click(); await expect(staff.getByLabel('Status Transition')).toBeEnabled();
 await staff.getByTestId('requester-pill').focus(); await staff.keyboard.press('Enter'); await expect(staff.getByRole('button',{name:/Sign Out/})).toBeVisible();
 await staff.keyboard.press('Escape'); await expect(staff.getByRole('button',{name:/Sign Out/})).toBeHidden();
 if(viewport.name.startsWith('mobile')) {await staff.getByTestId('mobile-nav-bar').getByRole('link',{name:'Dashboard',exact:true}).click(); await expect(staff.getByRole('heading',{name:'Staff Dashboard'})).toBeVisible();}
 await staff.goto('/dashboard'); await expect(staff.locator('.dashboard')).toHaveAttribute('aria-busy','false');
 await staff.getByRole('link',{name:/^Open: [0-9]+ tickets$/}).click(); await expect(staff.getByTestId('queue-status-filter')).toHaveValue('OPEN');
 await layout(staff); await capture(staff,info,`staff-${viewport.name}-drilldown`,data.prefix);
 await openTicket(requester,ticket.id); await expect(requester.locator('.actions-entry')).toHaveCount(2);
 await expect(requester.getByRole('button',{name:'Add Action',exact:true})).toHaveCount(0);
 await accessible(requester,info,'requester-actions'); await layout(requester); await capture(requester,info,`actions-${viewport.name}-read-only`,data.prefix);
 await requester.goto('/dashboard'); await requester.getByRole('link',{name:'My Open Tickets: 2 tickets',exact:true}).click();
 await expect(requester.getByTestId('filter-status-select')).toHaveValue('OPEN_GROUP'); await layout(requester);
 if(viewport.name.startsWith('mobile')) {
  await requester.setViewportSize({width:320,height:812}); await layout(requester);
  await requester.goto('/dashboard'); await expect(requester.locator('.dashboard')).toHaveAttribute('aria-busy','false');
  await layout(requester);
 }
 // Explicit synthetic typography stress probe; restore real data before capture.
 await requester.goto('/dashboard'); await expect(requester.locator('.dashboard')).toHaveAttribute('aria-busy','false');
 expect(await requester.locator('.dashboard-metric strong').first().evaluate(element=>{const previous=element.textContent;try{element.textContent='999999999999';return element.scrollWidth<=element.clientWidth+1;}finally{element.textContent=previous;}})).toBe(true);
 await info.attach('runtime-before-assertions',{body:JSON.stringify({runtime,responses,failedRequests},null,2),contentType:'application/json'});
 // Expected 409 browser network message is retained and classified, not suppressed.
 // Auth restoration/dev StrictMode can issue the same controlled request twice.
 // Retain every response in evidence and reject any unexpected endpoint/status.
 expect([...new Set(responses)]).toEqual(['503 /api/dashboard/staff','503 /api/dashboard/requester',`409 /api/staff/tickets/${ticket.id}/status`]);
 expect(responses.filter(response=>response.startsWith('409 '))).toHaveLength(1);
 expect(failedRequests.filter(message=>!message.startsWith('net::ERR_ABORTED '))).toEqual([]);
 expect(runtime.filter(message=>!message.includes('409 (Conflict)') && !message.includes('503 (Service Unavailable)'))).toEqual([]);
 await info.attach('runtime-classification',{body:JSON.stringify({runtime,responses,failedRequests},null,2),contentType:'application/json'});
});
