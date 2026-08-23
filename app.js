const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)];
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}), date=v=>new Date(v+'T12:00:00').toLocaleDateString('pt-BR');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=new Date().toISOString().slice(0,10);
const currentMonthLastDay=String(new Date(Number(today.slice(0,4)),Number(today.slice(5,7)),0).getDate()).padStart(2,'0');
let dashboardPeriod={start:`${today.slice(0,7)}-01`,end:`${today.slice(0,7)}-${currentMonthLastDay}`};
const supabaseClient=window.supabase.createClient(
  'https://pglafsnqlrkgcvnakyyi.supabase.co',
  'sb_publishable_sfyRmHH7ScK1Kt4sOw5lOQ_HwkjrRUR'
);
const ADMIN_EMAIL='lluiz7628rd@gmail.com';
const PUSH_PUBLIC_KEY='BBsMx8l85hsIMXt4Mdb1wymb3EUMjbISRg7v1fq8UHEGKrKcQatCH-Ln-mYiLbOvPejvtUie24yY_T7-J4adcK0';
const seed={
 sales:[],
 expenses:[],
 campaigns:[],
 partners:[],
 commissions:[],
 categories:[{id:'cat1',name:'Blox Fruits',icon:'⚔',fields:['Level','Frutas ingeridas','Frutas no inventário','Espadas','Guns','Fighting Styles','Acessórios','Raça','V4','Fragmentos','Beli','Gamepasses','Títulos','Sea liberado']},{id:'cat2',name:'Grow a Garden',icon:'🌱',fields:['Pets','Sementes','Dinheiro','Eventos','Itens raros','Gamepasses']},{id:'cat3',name:'Grow a Garden 2',icon:'🌿',fields:['Pets','Sementes','Dinheiro','Eventos','Itens raros','Gamepasses']},{id:'cat4',name:'Plants Vs Brainrots',icon:'🌻',fields:['Personagens','Itens','Gamepasses']},{id:'cat5',name:'Steal a Brainrots',icon:'🧠',fields:['Brainrots','Dinheiro','Itens raros']},{id:'cat6',name:'99 Noites na Floresta',icon:'🌲',fields:['Itens','Recursos','Nível','Equipamentos','Gamepasses']}],
 accounts:[{id:'a1',name:'Dragon V4 Full',login:'player_x',password:'••••••••',email:'conta@email.com',emailPassword:'••••••••',category:'Blox Fruits',buy:120,sell:349.9,status:'Disponível',attrs:{Level:'2550',Raça:'Ghoul',V4:'Sim'}},{id:'a2',name:'Garden Pets Pack',login:'garden_44',password:'••••••••',email:'garden@email.com',emailPassword:'••••••••',category:'Grow a Garden',buy:70,sell:189.9,status:'Reservada',attrs:{Pets:'Dragonfly, Raccoon'}},{id:'a3',name:'Brainrot Rare',login:'rare_br',password:'••••••••',email:'rare@email.com',emailPassword:'••••••••',category:'Steal a Brainrots',buy:95,sell:279.9,status:'Vendida',attrs:{Brainrots:'Tralalero, Bombardiro'}}],
 users:[{id:'u1',name:'Administrador',email:ADMIN_EMAIL,role:'Administrador',status:'Ativo'}]
};
let db=JSON.parse(localStorage.getItem('pixelsale-db')||'null')||seed;
const savedAdmin=db.users?.find(user=>user.role==='Administrador');
if(savedAdmin)savedAdmin.email=ADMIN_EMAIL;
const dataResetVersion='2026-08-02-sales-expenses';
if(localStorage.getItem('pixelsale-data-reset')!==dataResetVersion){
  db.sales=[];
  db.expenses=[];
  localStorage.setItem('pixelsale-db',JSON.stringify(db));
  localStorage.setItem('pixelsale-data-reset',dataResetVersion);
}
let page=new URLSearchParams(location.search).get('page')==='support'?'support':'dashboard';
let activeChatId=null,chatPollTimer=null,chatConversations=[],lastChatUnreadTotal=null,chatAudioContext=null;
/* Versão local substituída pela sincronização do Supabase.
const save=()=>localStorage.setItem('pixelsale-db',JSON.stringify(db));
const nav=[['Visão geral','dashboard','▦','Dashboard'],['Operação','sales','↗','Vendas'],['Operação','inventory','◇','Contas Roblox'],['Financeiro','finance','◉','Financeiro'],['Financeiro','traffic','⌁','Tráfego pago'],['Relacionamentos','customers','♙','Clientes'],['Relacionamentos','partners','♧','Parcerias'],['Relacionamentos','commissions','♙','Comissões'],['Atendimento','support','●','Mensagens'],['Gestão','reports','▥','Relatórios'],['Gestão','admin','⚙','Administração']];
*/
async function loadDatabase(){
  const {data:{user},error:userError}=await supabaseClient.auth.getUser();
  if(userError||!user)throw userError||new Error('Usuário não autenticado');
  const {data,error}=await supabaseClient.from('pixelsale_app_state').select('data').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  if(data?.data){
    db={...seed,...data.data};
    const admin=db.users?.find(account=>account.role==='Administrador');
    if(admin)admin.email=ADMIN_EMAIL;
    localStorage.setItem('pixelsale-db',JSON.stringify(db));
    return;
  }
  const {error:createError}=await supabaseClient.from('pixelsale_app_state').insert({user_id:user.id,data:db});
  if(createError)throw createError;
}
async function save(){
  db.partners.forEach(p=>p.createdAt=p.createdAt||recordCreatedDate(p)||today);
  localStorage.setItem('pixelsale-db',JSON.stringify(db));
  const {data:{user},error:userError}=await supabaseClient.auth.getUser();
  if(userError||!user)return false;
  const {error}=await supabaseClient.from('pixelsale_app_state').upsert({user_id:user.id,data:db,updated_at:new Date().toISOString()});
  if(error){
    console.error('Falha ao sincronizar com o Supabase:',error);
    showToast('Não foi possível sincronizar com o banco de dados.');
    return false;
  }
  return true;
}
const nav=[['Visão geral','dashboard','▦','Dashboard'],['Operação','sales','↗','Vendas'],['Operação','inventory','◇','Contas Roblox'],['Financeiro','finance','◉','Financeiro'],['Financeiro','traffic','⌁','Tráfego pago'],['Relacionamentos','customers','♙','Clientes'],['Relacionamentos','partners','♧','Parcerias'],['Relacionamentos','commissions','♙','Comissões'],['Atendimento','support','●','Mensagens'],['Gestão','reports','▥','Relatórios'],['Gestão','admin','⚙','Administração']];
function renderNav(){let last='';$('#nav').innerHTML=nav.map(n=>{let s=n[0]!==last?`<div class="nav-section">${last=n[0]}</div>`:'';return s+`<button class="nav-btn ${page===n[1]?'active':''}" data-page="${n[1]}"><span class="nav-icon">${n[2]}</span>${n[3]}</button>`}).join('');$$('.nav-btn').forEach(b=>b.onclick=()=>{page=b.dataset.page;render();$('#sidebar').classList.remove('open')})}
const head=(t,s,actions='')=>`<div class="page-head"><div><h1>${t}</h1><p>${s}</p></div><div class="head-actions">${actions}</div></div>`;
const kpi=(label,value,icon='↗',color='var(--purple)',trend='Atualizado agora')=>`<div class="kpi" style="--accent:${color}"><div class="kpi-top"><span>${label}</span><span class="kpi-icon">${icon}</span></div><strong>${value}</strong><span class="trend">${trend}</span></div>`;
const whatsappNumber=contact=>{let digits=String(contact||'').replace(/\D/g,'').replace(/^0+/,'');if(digits.length===10||digits.length===11)digits='55'+digits;return digits.length>=12&&digits.length<=13?digits:''};
const whatsappButton=(contact,name)=>{let number=whatsappNumber(contact);return number?`<a class="action whatsapp-action" href="https://wa.me/${number}?text=${encodeURIComponent(`Olá, ${name}!`)}" target="_blank" rel="noopener noreferrer" title="Conversar pelo WhatsApp">WhatsApp</a>`:''};
const rowActions=(formType,collection,id,contact='',name='')=>`<div class="row-actions">${whatsappButton(contact,name)}<button class="action edit-action" onclick="openForm('${formType}','${id}')">Alterar</button><button class="action delete-action" onclick="removeItem('${collection}','${id}')" title="Excluir">×</button></div>`;
const profit=s=>+s.value-+s.cost-+(s.commission||0)-+(s.partnership||0);
function dashboardLegacy(){
  const monthKey=d=>String(d||'').slice(0,7), now=new Date();
  const keyFor=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const currentKey=keyFor(now), previousKey=keyFor(new Date(now.getFullYear(),now.getMonth()-1,1));
  const sum=(rows,field='value')=>rows.reduce((total,row)=>total+Number(row[field]||0),0);
  const monthData=key=>{
    const sales=db.sales.filter(s=>monthKey(s.date)===key);
    const completed=sales.filter(s=>s.status==='Concluída');
    const financial=db.expenses.filter(e=>monthKey(e.date)===key);
    const productCosts=sum(financial.filter(e=>['Compra de contas','Compra de itens','Produtos'].includes(e.category)));
    const trafficExpenses=sum(financial.filter(e=>e.category==='Tráfego pago'));
    const partnershipExpenses=sum(financial.filter(e=>e.category==='Parcerias'));
    const commissionExpenses=sum(financial.filter(e=>e.category==='Comissões'));
    const classified=new Set(['Compra de contas','Compra de itens','Produtos','Tráfego pago','Parcerias','Comissões']);
    const partnerAgreements=sum(db.partners.filter(p=>monthKey(p.due)===key&&p.status!=='Inativo'));
    const partnerships=partnerAgreements+partnershipExpenses;
    const commissions=sum(db.commissions.filter(c=>monthKey(c.date)===key&&c.status==='Pago'))+commissionExpenses;
    const traffic=sum(db.campaigns.filter(c=>monthKey(c.start)===key))+trafficExpenses;
    const other=sum(financial.filter(e=>!classified.has(e.category)));
    const revenue=sum(completed), saleCosts=sum(completed,'cost');
    const grossProfit=revenue-saleCosts, expenses=productCosts+partnerships+commissions+traffic+other;
    return {sales,completed,revenue,saleCosts,grossProfit,productCosts,partnerships,commissions,traffic,other,expenses,net:grossProfit-expenses};
  };
  const trend=(current,previous)=>{
    if(!current&&!previous)return 'Sem movimentação';
    if(!previous)return 'Sem histórico anterior';
    const change=(current-previous)/Math.abs(previous)*100;
    return `${change>=0?'↑':'↓'} ${Math.abs(change).toLocaleString('pt-BR',{maximumFractionDigits:1})}% vs. mês anterior`;
  };
  const current=monthData(currentKey), previous=monthData(previousKey);
  const pending=sum(db.commissions.filter(c=>monthKey(c.date)===currentKey&&c.status==='Pendente'));
  const months=Array.from({length:12},(_,index)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+index,1);return {label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),...monthData(keyFor(d))}});
  const chartMax=Math.max(0,...months.flatMap(m=>[Math.max(0,m.grossProfit),m.expenses]));
  const chart=chartMax?months.map(m=>`<div class="bar-group" title="${m.label}: lucro bruto ${money(m.grossProfit)} · despesas ${money(m.expenses)} · líquido ${money(m.net)}"><i class="bar ${m.grossProfit>0?'':'is-zero'}" style="height:${Math.max(0,m.grossProfit)/chartMax*100}%"></i><i class="bar alt ${m.expenses?'':'is-zero'}" style="height:${m.expenses/chartMax*100}%"></i><label>${m.label}</label></div>`).join(''):`<div class="chart-empty"><b>Sem dados financeiros</b><span>Cadastre vendas ou despesas para visualizar a evolução.</span></div>`;
  const spending=[['Produtos',current.productCosts,'var(--purple)'],['Tráfego',current.traffic,'var(--blue)'],['Parcerias',current.partnerships,'var(--yellow)'],['Comissões',current.commissions,'var(--green)'],['Outros',current.other,'var(--red)']];
  let accumulated=0;
  const gradient=spending.map(([,value,color])=>{const start=accumulated;accumulated+=current.expenses?value/current.expenses*100:0;return `${color} ${start}% ${accumulated}%`}).join(',');
  const distribution=current.expenses?`<div class="donut" style="background:conic-gradient(${gradient})"></div><div class="legend">${spending.map(([label,value,color])=>`<div style="--c:${color}">${label} · ${(value/current.expenses*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%<span>${money(value)}</span></div>`).join('')}</div>`:`<div class="donut donut-empty"></div><div class="chart-empty compact"><b>Sem gastos no mês</b><span>A distribuição aparecerá após um lançamento.</span></div>`;
  return head('Dashboard','Visão geral do desempenho da PixelSale',`<button class="secondary" onclick="exportCSV('sales')">⇩ Exportar</button><button class="primary" onclick="openForm('sale')">＋ Nova venda</button>`)+`<div class="kpi-grid">${kpi('Faturamento bruto',money(current.revenue),'↗','var(--purple)',trend(current.revenue,previous.revenue))}${kpi('Lucro líquido',money(current.net),'◇','var(--green)',trend(current.net,previous.net))}${kpi('Despesas totais',money(current.expenses),'▤','var(--red)','Despesas financeiras do mês')}${kpi('Lucro bruto',money(current.grossProfit),'◉','var(--blue)','Vendas menos custo dos produtos')}${kpi('Total de vendas',current.sales.length,'▣','var(--blue)','Vendas registradas no mês')}${kpi('Ticket médio',money(current.completed.length?current.revenue/current.completed.length:0),'◉','var(--yellow)','Média das vendas concluídas')}${kpi('Comissões pagas',money(current.commissions),'✓','var(--green)','Valores pagos no mês')}${kpi('Comissões pendentes',money(pending),'!','var(--yellow)','Pendentes no mês')}</div><div class="grid-2"><div class="panel"><div class="panel-head"><h3>Evolução financeira</h3><span class="muted">Lucro bruto × despesas · 12 meses</span></div><div class="chart">${chart}</div></div><div class="panel"><div class="panel-head"><h3>Distribuição de gastos</h3><span class="muted">Mês atual</span></div><div class="donut-wrap">${distribution}</div></div></div>${salesTable(db.sales.slice(0,5),'Vendas recentes')}`;
}
const inPeriod=(value,start,end)=>Boolean(value&&value>=start&&value<=end);
const sumRows=(rows,field='value')=>rows.reduce((total,row)=>total+Number(row[field]||0),0);
function recurringStoreFeeOccurrences(start='0000-01-01',end=today){
  const cutoff=end<today?end:today,occurrences=[];
  db.expenses.filter(expense=>expense.category==='Mensalidade da loja'&&expense.date).forEach(fee=>{
    const firstDate=new Date(`${fee.date}T12:00:00`);
    if(Number.isNaN(firstDate.getTime()))return;
    for(let cycle=0;cycle<1200;cycle++){
      const occurrenceDate=new Date(firstDate);occurrenceDate.setDate(firstDate.getDate()+(cycle*30));
      const occurrenceIso=isoDate(occurrenceDate);
      if(occurrenceIso>cutoff)break;
      if(occurrenceIso>=start)occurrences.push({...fee,id:`${fee.id}-cycle-${cycle}`,sourceId:fee.id,date:occurrenceIso,generated:cycle>0,cycle});
    }
  });
  return occurrences;
}
const expensesInRange=(start,end)=>[
  ...db.expenses.filter(expense=>expense.category!=='Mensalidade da loja'&&inPeriod(expense.date,start,end)),
  ...recurringStoreFeeOccurrences(start,end)
];
const recordCreatedDate=record=>{
  if(record.createdAt)return String(record.createdAt).slice(0,10);
  const id=String(record.id||'');
  if(id.length>5){
    const timestamp=parseInt(id.slice(0,-4),36),created=new Date(timestamp);
    if(Number.isFinite(timestamp)&&created.getFullYear()>=2020&&created.getFullYear()<=2100)return created.toISOString().slice(0,10);
  }
  return record.date||record.start||record.due||'';
};
function financialRange(start,end){
  const sales=db.sales.filter(s=>inPeriod(s.date,start,end));
  const completed=sales.filter(s=>s.status==='Concluída');
  const financial=expensesInRange(start,end);
  const productCategories=['Compra de contas','Compra de itens','Produtos'];
  const classified=new Set([...productCategories,'Tráfego pago','Parcerias','Comissões','Mensalidade da loja']);
  const productCosts=sumRows(financial.filter(e=>productCategories.includes(e.category)));
  const traffic=sumRows(db.campaigns.filter(c=>inPeriod(c.start,start,end)))+sumRows(financial.filter(e=>e.category==='Tráfego pago'));
  const partnerships=sumRows(db.partners.filter(p=>inPeriod(recordCreatedDate(p),start,end)&&p.status!=='Inativo'))+sumRows(financial.filter(e=>e.category==='Parcerias'));
  const commissions=sumRows(db.commissions.filter(c=>inPeriod(c.date,start,end)&&c.status==='Pago'))+sumRows(financial.filter(e=>e.category==='Comissões'));
  const storeFees=sumRows(financial.filter(e=>e.category==='Mensalidade da loja'));
  const other=sumRows(financial.filter(e=>!classified.has(e.category)));
  const revenue=sumRows(completed),saleCosts=sumRows(completed,'cost'),grossProfit=revenue-saleCosts,expenses=productCosts+traffic+partnerships+commissions+storeFees+other;
  return {sales,completed,revenue,saleCosts,grossProfit,productCosts,traffic,partnerships,commissions,storeFees,other,expenses,net:grossProfit-expenses};
}
const isoDate=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function shiftPeriod(start,end){
  const startDate=new Date(`${start}T12:00:00`),endDate=new Date(`${end}T12:00:00`),days=Math.round((endDate-startDate)/86400000)+1;
  const previousEnd=new Date(startDate);previousEnd.setDate(previousEnd.getDate()-1);
  const previousStart=new Date(previousEnd);previousStart.setDate(previousStart.getDate()-days+1);
  return {start:isoDate(previousStart),end:isoDate(previousEnd)};
}
function dashboardMonths(start,end){
  const months=[],cursor=new Date(`${start.slice(0,7)}-01T12:00:00`),last=end.slice(0,7);
  while(months.length<36){
    const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`;
    const monthStart=key===start.slice(0,7)?start:`${key}-01`;
    const lastDay=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
    const monthEnd=key===last?end:`${key}-${lastDay}`;
    months.push({label:cursor.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.',''),...financialRange(monthStart,monthEnd)});
    if(key===last)break;
    cursor.setMonth(cursor.getMonth()+1);
  }
  return months;
}
function applyDashboardPeriod(){
  const start=$('#dashboardStart').value,end=$('#dashboardEnd').value;
  if(!start||!end||start>end)return showToast('Informe um período válido.');
  dashboardPeriod={start,end};render();
}
function dashboard(){
  const {start,end}=dashboardPeriod,previousPeriod=shiftPeriod(start,end),current=financialRange(start,end),previous=financialRange(previousPeriod.start,previousPeriod.end);
  const trend=(value,before)=>!value&&!before?'Sem movimentação':!before?'Sem histórico anterior':`${value>=before?'↑':'↓'} ${Math.abs((value-before)/Math.abs(before)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% vs. período anterior`;
  const pending=sumRows(db.commissions.filter(c=>inPeriod(c.date,start,end)&&c.status==='Pendente'));
  const months=dashboardMonths(start,end),chartMax=Math.max(0,...months.flatMap(m=>[Math.max(0,m.grossProfit),m.expenses]));
  const chart=chartMax?months.map(m=>`<div class="bar-group" title="${m.label}: lucro bruto ${money(m.grossProfit)} · despesas ${money(m.expenses)} · líquido ${money(m.net)}"><i class="bar ${m.grossProfit>0?'':'is-zero'}" style="height:${Math.max(0,m.grossProfit)/chartMax*100}%"></i><i class="bar alt ${m.expenses?'':'is-zero'}" style="height:${m.expenses/chartMax*100}%"></i><label>${m.label}</label></div>`).join(''):`<div class="chart-empty"><b>Sem dados financeiros</b><span>Não há movimentações no período selecionado.</span></div>`;
  const spending=[['Produtos',current.productCosts,'var(--purple)'],['Tráfego',current.traffic,'var(--blue)'],['Parcerias',current.partnerships,'var(--yellow)'],['Comissões',current.commissions,'var(--green)'],['Mensalidade da loja',current.storeFees,'#ec4899'],['Outros',current.other,'var(--red)']];
  let accumulated=0;
  const gradient=spending.map(([,value,color])=>{const from=accumulated;accumulated+=current.expenses?value/current.expenses*100:0;return `${color} ${from}% ${accumulated}%`}).join(',');
  const distribution=current.expenses?`<div class="donut" style="background:conic-gradient(${gradient})"></div><div class="legend">${spending.map(([label,value,color])=>`<div style="--c:${color}">${label} · ${(value/current.expenses*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%<span>${money(value)}</span></div>`).join('')}</div>`:`<div class="donut donut-empty"></div><div class="chart-empty compact"><b>Sem gastos no período</b><span>A distribuição aparecerá após um lançamento.</span></div>`;
  const actions=`<div class="period-controls"><label>De <input type="date" id="dashboardStart" value="${start}"></label><label>Até <input type="date" id="dashboardEnd" value="${end}"></label><button class="secondary" onclick="applyDashboardPeriod()">Aplicar</button><button class="secondary" onclick="openExportModal()">⇩ Excel</button><button class="primary" onclick="openForm('sale')">＋ Nova venda</button></div>`;
  return head('Dashboard',`Resultados de ${date(start)} até ${date(end)}`,actions)+`<div class="kpi-grid">${kpi('Faturamento bruto',money(current.revenue),'↗','var(--purple)',trend(current.revenue,previous.revenue))}${kpi('Lucro líquido',money(current.net),'◇','var(--green)',trend(current.net,previous.net))}${kpi('Despesas totais',money(current.expenses),'▤','var(--red)','Despesas do período')}${kpi('Lucro bruto',money(current.grossProfit),'◉','var(--blue)','Vendas menos custo dos produtos')}${kpi('Total de vendas',current.sales.length,'▣','var(--blue)','Vendas registradas')}${kpi('Ticket médio',money(current.completed.length?current.revenue/current.completed.length:0),'◉','var(--yellow)','Média das vendas concluídas')}${kpi('Comissões pagas',money(current.commissions),'✓','var(--green)','Valores pagos')}${kpi('Comissões pendentes',money(pending),'!','var(--yellow)','Pendentes no período')}</div><div class="grid-2"><div class="panel"><div class="panel-head"><h3>Evolução financeira</h3><span class="muted">Lucro bruto × despesas · período selecionado</span></div><div class="chart">${chart}</div></div><div class="panel"><div class="panel-head"><h3>Distribuição de gastos</h3><span class="muted">Período selecionado</span></div><div class="donut-wrap">${distribution}</div></div></div>${salesTable(current.sales.slice(0,5),'Vendas recentes do período')}`;
}
const statusClass=s=>/Concluída|Disponível|Pago|Ativo/.test(s)?'green':/Pendente|Reservada/.test(s)?'yellow':'red';
function salesTable(rows,title='Todas as vendas'){return `<div class="panel table-panel"><div class="panel-head"><h3>${title}</h3><span class="muted">${rows.length} registros</span></div><table><thead><tr><th>Cliente / Produto</th><th>Categoria</th><th>Valor</th><th>Lucro</th><th>Pagamento</th><th>Data</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(s=>`<tr><td><b>${s.client}</b><br><span class="muted">${s.product}</span>${s.contact?`<br><span class="sale-contact">Contato: ${escapeHtml(s.contact)}</span>`:''}</td><td>${s.category}</td><td>${money(s.value)}</td><td style="color:var(--green)">${money(profit(s))}</td><td>${s.payment}</td><td>${date(s.date)}</td><td><span class="badge ${statusClass(s.status)}">${s.status}</span></td><td>${rowActions('sale','sales',s.id,s.contact,s.client)}</td></tr>`).join('')||`<tr><td colspan="8" class="empty"><b>Nenhuma venda encontrada</b>Cadastre sua primeira venda.</td></tr>`}</tbody></table></div>`}
function sales(){return head('Gestão de vendas','Cadastre, acompanhe e filtre todas as vendas',`<button class="primary" onclick="openForm('sale')">＋ Cadastrar venda</button>`)+`<div class="filters"><input class="input" id="saleSearch" placeholder="Buscar cliente ou produto"><select id="saleStatus"><option value="">Todos os status</option><option>Concluída</option><option>Pendente</option><option>Cancelada</option></select><select id="saleCategory"><option value="">Todas as categorias</option>${db.categories.map(c=>`<option>${c.name}</option>`).join('')}</select></div><div id="salesResult">${salesTable(db.sales)}</div>`}
function inventory(){let available=db.accounts.filter(a=>a.status==='Disponível'), invested=db.accounts.reduce((x,a)=>x + +a.buy,0), potential=db.accounts.filter(a=>a.status!=='Vendida').reduce((x,a)=>x + +a.sell,0);return head('Contas Roblox','Estoque inteligente com atributos personalizados',`<button class="secondary" onclick="openForm('category')">＋ Categoria</button><button class="primary" onclick="openForm('account')">＋ Nova conta</button>`)+`<div class="kpi-grid">${kpi('Disponíveis',available.length,'◇','var(--green)')}${kpi('Vendidas',db.accounts.filter(a=>a.status==='Vendida').length,'✓','var(--blue)')}${kpi('Valor investido',money(invested),'▤','var(--yellow)')}${kpi('Venda potencial',money(potential),'↗','var(--purple)')}</div><div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Estoque por categoria</h3><span class="muted">Categorias editáveis</span></div><div class="stock-grid">${db.categories.map(c=>{let arr=db.accounts.filter(a=>a.category===c.name),av=arr.filter(a=>a.status==='Disponível').length;return `<div class="stock-card"><div class="game"><div class="game-icon">${c.icon}</div><div><h3>${c.name}</h3><p>${c.fields.length} atributos personalizados</p></div></div><div class="stock-stats"><span>DISPONÍVEL<b>${av}</b></span><span>TOTAL<b>${arr.length}</b></span><span>POTENCIAL<b>${money(arr.reduce((x,a)=>x + +a.sell,0))}</b></span></div><div class="progress"><i style="width:${arr.length?av/arr.length*100:0}%"></i></div></div>`}).join('')}</div></div><div class="panel table-panel"><div class="panel-head"><h3>Contas cadastradas</h3><span class="muted">${db.accounts.length} contas</span></div><table><thead><tr><th>Conta</th><th>Categoria</th><th>Compra</th><th>Venda</th><th>Margem</th><th>Status</th><th></th></tr></thead><tbody>${db.accounts.map(a=>`<tr><td><b>${a.name}</b><br><span class="muted">${a.login}</span></td><td>${a.category}</td><td>${money(a.buy)}</td><td>${money(a.sell)}</td><td style="color:var(--green)">${money(a.sell-a.buy)}</td><td><span class="badge ${statusClass(a.status)}">${a.status}</span></td><td>${rowActions('account','accounts',a.id)}</td></tr>`).join('')}</tbody></table></div>`}
function genericPage(type,title,sub,columns,formType,customRows=null){let rows=customRows||db[type];return head(title,sub,`<button class="primary" onclick="openForm('${formType}')">＋ Novo registro</button>`)+`<div class="kpi-grid">${kpi('Total registrado',rows.length,'▦','var(--blue)')}${kpi('Volume financeiro',money(rows.reduce((a,x)=>a+ +(x.value||0),0)),'↗','var(--green)')}${kpi('Pendentes',rows.filter(x=>x.status==='Pendente').length,'!','var(--yellow)')}${kpi('Atualizados hoje',rows.filter(x=>(x.date||x.start||x.due)===today).length,'✓','var(--purple)')}</div><div class="panel table-panel"><div class="panel-head"><h3>${title}</h3><span class="muted">${rows.length} registros</span></div><table><thead><tr>${columns.map(c=>`<th>${c[0]}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td>${c[2]==='money'?money(r[c[1]]):c[2]==='date'?date(r[c[1]]):c[1]==='status'?`<span class="badge ${statusClass(r[c[1]])}">${r[c[1]]}</span>`:(r[c[1]]||'—')}</td>`).join('')}<td>${r.generated?'<span class="muted">Automático</span>':rowActions(formType,type,r.sourceId||r.id)}</td></tr>`).join('')||`<tr><td colspan="${columns.length+1}" class="empty"><b>Nenhum registro</b>Use o botão acima para começar.</td></tr>`}</tbody></table></div>`}
function finance(){
  const fees=recurringStoreFeeOccurrences().sort((a,b)=>b.date.localeCompare(a.date));
  const feeTotal=sumRows(fees),currentFeeTotal=sumRows(fees.filter(e=>String(e.date).slice(0,7)===today.slice(0,7)));
  const feeTable=`<div class="panel table-panel"><div class="panel-head"><div><h3>Mensalidades da loja</h3><span class="muted">Cobrança automática a cada 30 dias</span></div><button class="primary" onclick="openForm('storeFee')">＋ Adicionar mensalidade</button></div><table><thead><tr><th>Referência</th><th>Valor</th><th>Pagamento</th><th>Vencimento / pagamento</th><th></th></tr></thead><tbody>${fees.map(f=>`<tr><td><b>${escapeHtml(f.description)}</b>${f.generated?`<br><span class="muted">Renovação automática · ciclo ${f.cycle+1}</span>`:f.notes?`<br><span class="muted">${escapeHtml(f.notes)}</span>`:''}</td><td>${money(f.value)}</td><td>${escapeHtml(f.payment||'—')}</td><td>${date(f.date)}</td><td>${f.generated?'<span class="muted">Automático</span>':rowActions('storeFee','expenses',f.sourceId)}</td></tr>`).join('')||`<tr><td colspan="5" class="empty"><b>Nenhuma mensalidade cadastrada</b>Adicione a mensalidade da loja para incluí-la nos custos e relatórios.</td></tr>`}</tbody></table></div>`;
  const expenseRows=[...db.expenses.filter(e=>e.category!=='Mensalidade da loja'),...fees].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const expenses=genericPage('expenses','Controle financeiro','Receitas e despesas em um só lugar',[['Descrição','description'],['Categoria','category'],['Valor','value','money'],['Pagamento','payment'],['Data','date','date']],'expense',expenseRows);
  return expenses.replace(`<div class="kpi-grid">`,`<div class="kpi-grid">${kpi('Mensalidade neste mês',money(currentFeeTotal),'▣','#ec4899','Incluída no lucro líquido')}${kpi('Total em mensalidades',money(feeTotal),'↗','var(--purple)',`${fees.length} lançamentos`)}</div>${feeTable}<div class="kpi-grid">`);
}
function traffic(){return genericPage('campaigns','Tráfego pago','Controle de campanhas e investimento em mídia',[['Campanha','name'],['Plataforma','platform'],['Investimento','value','money'],['Início','start','date'],['Fim','end','date']],'campaign')}
function customers(){
  const grouped=new Map();
  db.sales.forEach(s=>{
    const key=whatsappNumber(s.contact)||`name:${String(s.client||'').trim().toLowerCase()}`;
    const customer=grouped.get(key)||{name:s.client,contact:s.contact||'',sales:0,completed:0,revenue:0,lastDate:''};
    customer.name=s.client||customer.name;
    if(s.contact)customer.contact=s.contact;
    customer.sales++;
    if(s.status==='Concluída'){customer.completed++;customer.revenue+=Number(s.value||0)}
    if(!customer.lastDate||s.date>customer.lastDate)customer.lastDate=s.date;
    grouped.set(key,customer);
  });
  const rows=[...grouped.values()].sort((a,b)=>b.lastDate.localeCompare(a.lastDate));
  const completed=rows.reduce((total,c)=>total+c.completed,0),revenue=rows.reduce((total,c)=>total+c.revenue,0),withWhatsapp=rows.filter(c=>whatsappNumber(c.contact)).length;
  return head('Clientes','Base criada automaticamente a partir das vendas')+`<div class="kpi-grid">${kpi('Total de clientes',rows.length,'♙','var(--blue)','Clientes identificados nas vendas')}${kpi('Com WhatsApp',withWhatsapp,'◉','var(--green)','Contatos válidos disponíveis')}${kpi('Compras concluídas',completed,'✓','var(--purple)','Vendas concluídas')}${kpi('Faturamento da base',money(revenue),'↗','var(--yellow)','Receita concluída')}</div><div class="panel table-panel"><div class="panel-head"><h3>Base de clientes</h3><span class="muted">${rows.length} clientes</span></div><table><thead><tr><th>Cliente</th><th>Contato</th><th>Vendas</th><th>Concluídas</th><th>Faturamento</th><th>Última compra</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr><td><b>${escapeHtml(c.name)}</b></td><td>${c.contact?escapeHtml(c.contact):'<span class="muted">Não informado</span>'}</td><td>${c.sales}</td><td>${c.completed}</td><td>${money(c.revenue)}</td><td>${c.lastDate?date(c.lastDate):'—'}</td><td><div class="row-actions">${whatsappButton(c.contact,c.name)||'<span class="muted">Sem WhatsApp</span>'}</div></td></tr>`).join('')||`<tr><td colspan="7" class="empty"><b>Nenhum cliente ainda</b>Os clientes aparecerão automaticamente após o cadastro das vendas.</td></tr>`}</tbody></table></div>`;
}
function partners(){return genericPage('partners','Gestão de parcerias','Acordos, vencimentos e histórico de pagamentos',[['Parceiro','name'],['Tipo','type'],['Valor acordado','value','money'],['Frequência','frequency'],['Vencimento','due','date'],['Status','status']],'partner')}
function commissionTable(rows,title,dateLabel){return `<div class="panel table-panel"><div class="panel-head"><h3>${title}</h3><span class="muted">${rows.length} registros</span></div><table><thead><tr><th>Nome</th><th>Valor</th><th>${dateLabel}</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr><td><b>${c.name}</b></td><td>${money(c.value)}</td><td>${date(c.date)}</td><td><span class="badge ${statusClass(c.status)}">${c.status}</span></td><td>${rowActions('commission','commissions',c.id)}</td></tr>`).join('')||`<tr><td colspan="5" class="empty"><b>Nenhuma comissão</b>Não há valores nesta situação.</td></tr>`}</tbody></table></div>`}
function commissions(){let paid=db.commissions.filter(c=>c.status==='Pago'),pending=db.commissions.filter(c=>c.status==='Pendente'),paidTotal=paid.reduce((a,c)=>a + +c.value,0),pendingTotal=pending.reduce((a,c)=>a + +c.value,0);return head('Gestão de comissões','Pagamentos organizados por situação',`<button class="primary" onclick="openForm('commission')">＋ Nova comissão</button>`)+`<div class="commission-summary"><div class="commission-box paid"><span>TOTAL PAGO</span><strong>${money(paidTotal)}</strong></div><div class="commission-box pending"><span>TOTAL PENDENTE</span><strong>${money(pendingTotal)}</strong></div></div>${commissionTable(pending,'Comissões pendentes','Data prevista')}${commissionTable(paid,'Comissões pagas','Data do pagamento')}`}
function reports(){return head('Relatórios','Analise e exporte os resultados da operação',`<button class="secondary" onclick="window.print()">▣ Salvar PDF</button><button class="primary" onclick="openExportModal()">⇩ Exportar Excel</button>`)+`<div class="filters"><input type="date" class="input" id="dashboardStart" value="${dashboardPeriod.start}"><input type="date" class="input" id="dashboardEnd" value="${dashboardPeriod.end}"><button class="secondary" onclick="applyDashboardPeriod()">Aplicar período</button></div>${dashboard().split('<div class="grid-2">')[1]}`}

function support(){return head('Atendimento','Converse em tempo real com os clientes da loja',`<button class="secondary" onclick="enableMobileNotifications()">🔔 Ativar notificações</button><button class="secondary" onclick="enableChatSound()">🔊 Testar som</button><button class="secondary" onclick="loadAdminChats()">↻ Atualizar</button>`)+`<div class="support-layout"><aside class="support-list" id="supportList"><div class="support-loading">Carregando conversas…</div></aside><section class="support-thread" id="supportThread"><div class="support-placeholder"><span>●</span><strong>Selecione uma conversa</strong><p>As mensagens do cliente aparecerão aqui.</p></div></section></div>`}
const chatTime=value=>new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
async function unlockChatAudio(){const AudioEngine=window.AudioContext||window.webkitAudioContext;if(!AudioEngine)return false;if(!chatAudioContext)chatAudioContext=new AudioEngine();if(chatAudioContext.state==='suspended')await chatAudioContext.resume();return chatAudioContext.state==='running'}
document.addEventListener('pointerdown',unlockChatAudio);document.addEventListener('keydown',unlockChatAudio);
async function playChatAlert(){if(!await unlockChatAudio())return false;const now=chatAudioContext.currentTime,master=chatAudioContext.createGain(),compressor=chatAudioContext.createDynamicsCompressor();master.gain.value=1;compressor.threshold.value=-18;compressor.knee.value=8;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.2;master.connect(compressor).connect(chatAudioContext.destination);[0,.28,.56,1.05,1.33,1.61,2.1,2.38,2.66].forEach((delay,index)=>{[760,1040,1380].forEach((frequency,layer)=>{const oscillator=chatAudioContext.createOscillator(),gain=chatAudioContext.createGain();oscillator.type=layer===1?'square':'sawtooth';oscillator.frequency.value=frequency+(index%2?90:0);gain.gain.setValueAtTime(.0001,now+delay);gain.gain.exponentialRampToValueAtTime(.95,now+delay+.012);gain.gain.setValueAtTime(.95,now+delay+.18);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.27);oscillator.connect(gain).connect(master);oscillator.start(now+delay);oscillator.stop(now+delay+.29)})});setTimeout(()=>{master.disconnect();compressor.disconnect()},3300);const originalTitle=document.title;document.title='🔴 NOVA MENSAGEM — PixelSale';setTimeout(()=>document.title=originalTitle,7000);if('Notification'in window&&Notification.permission==='granted')new Notification('Nova mensagem no atendimento',{body:'Um cliente enviou uma nova mensagem.',tag:'pixelsale-chat',requireInteraction:true});return true}
async function enableChatSound(){if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission();const worked=await playChatAlert();showToast(worked?'Som do atendimento ativado.':'O navegador bloqueou o som. Verifique se a aba está silenciada.')}
function urlBase64ToUint8Array(value){const padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64);return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)))}
async function enableMobileNotifications(){
  if(!('serviceWorker'in navigator)||!('PushManager'in window))return showToast('Este navegador não oferece notificações push. Use o Chrome no Android.');
  const permission=await Notification.requestPermission();if(permission!=='granted')return showToast('Permita as notificações nas configurações do navegador.');
  try{const registration=await navigator.serviceWorker.ready;let subscription=await registration.pushManager.getSubscription();if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(PUSH_PUBLIC_KEY)});const json=subscription.toJSON();const {error}=await supabaseClient.rpc('chat_push_subscribe',{p_endpoint:subscription.endpoint,p_p256dh:json.keys.p256dh,p_auth:json.keys.auth});if(error)throw error;await registration.showNotification('PixelSale',{body:'Notificações de novas mensagens ativadas neste celular.',icon:'/assets/pixelsale-logo.png',badge:'/assets/pixelsale-logo.png',tag:'pixelsale-enabled'});showToast('Notificações ativadas neste celular.')}catch(error){console.error(error);showToast('Não foi possível ativar as notificações.')}
}
function updateChatUnreadAlert(rows){const unreadTotal=(rows||[]).reduce((total,item)=>total+Number(item.unread_admin||0),0);if(unreadTotal>0&&(lastChatUnreadTotal===null||unreadTotal>lastChatUnreadTotal))playChatAlert();lastChatUnreadTotal=unreadTotal}
async function pollChatNotifications(){const {data,error}=await supabaseClient.rpc('chat_admin_list');if(!error)updateChatUnreadAlert(data)}
async function loadAdminChats(){
  const list=$('#supportList');if(!list)return;
  const {data,error}=await supabaseClient.rpc('chat_admin_list');
  if(error){console.error(error);list.innerHTML='<div class="support-loading support-error">Execute a migração do chat no Supabase para ativar o atendimento.</div>';return}
  chatConversations=data||[];updateChatUnreadAlert(chatConversations);
  list.innerHTML=chatConversations.length?chatConversations.map(item=>`<button class="support-contact ${activeChatId===item.id?'active':''}" onclick="selectAdminChat('${item.id}')"><span class="support-avatar">${escapeHtml((item.customer_name||'V').slice(0,2).toUpperCase())}</span><span class="support-contact-copy"><strong>${escapeHtml(item.customer_name||'Visitante')}</strong><small>${escapeHtml(item.last_message||'Nova conversa')}</small><time>${chatTime(item.updated_at)}</time></span>${Number(item.unread_admin)>0?`<b>${item.unread_admin}</b>`:''}</button>`).join(''):'<div class="support-loading">Nenhuma conversa ainda.</div>';
  if(activeChatId&&!chatConversations.some(item=>item.id===activeChatId))activeChatId=null;
  if(activeChatId)await loadAdminMessages(false);
}
async function selectAdminChat(id){activeChatId=id;await loadAdminChats();await loadAdminMessages(true)}
async function loadAdminMessages(scroll=true){
  const thread=$('#supportThread');if(!thread||!activeChatId)return;
  if(!scroll&&document.activeElement===$('#supportReply textarea'))return;
  const conversation=chatConversations.find(item=>item.id===activeChatId);if(!conversation)return;
  const previousInput=$('#supportReply textarea'),draft=previousInput?.value||'',restoreFocus=document.activeElement===previousInput,selectionStart=previousInput?.selectionStart,selectionEnd=previousInput?.selectionEnd;
  const {data,error}=await supabaseClient.rpc('chat_admin_messages',{p_conversation_id:activeChatId});if(error)return showToast('Não foi possível carregar as mensagens.');if(!scroll&&document.activeElement===$('#supportReply textarea'))return;
  const started=Boolean(conversation.atendimento_started_at);
  thread.innerHTML=`<header class="support-thread-head"><div><strong>${escapeHtml(conversation.customer_name||'Visitante')}</strong><span>${escapeHtml(conversation.customer_email||'Sem e-mail')}</span></div><div class="support-thread-actions">${!started||conversation.status==='closed'?`<button class="primary" type="button" id="startSupport">${conversation.status==='closed'?'Reabrir atendimento':'Iniciar atendimento'}</button>`:''}<select id="supportStatus"><option value="open">Aberta</option><option value="pending">Pendente</option><option value="closed">Encerrada</option></select></div></header><div class="support-messages" id="supportMessages">${(data||[]).map(message=>`<div class="support-message ${message.sender==='admin'?'support-message-admin':''} ${message.message_type==='image'?'support-message-image':''}">${message.message_type==='image'&&message.media_data?`<a href="${message.media_data}" target="_blank" rel="noopener"><img src="${message.media_data}" alt="Foto enviada pelo cliente"></a>`:escapeHtml(message.body)}<time>${chatTime(message.created_at)}</time></div>`).join('')||'<div class="support-loading">Nenhuma mensagem.</div>'}</div>${started&&conversation.status!=='closed'?'<form class="support-reply" id="supportReply"><textarea maxlength="2000" rows="1" placeholder="Digite sua resposta…" required></textarea><button class="primary" type="submit">Enviar</button></form>':'<div class="support-awaiting">'+(conversation.status==='closed'?'Clique em <b>Reabrir atendimento</b> para responder.':'Clique em <b>Iniciar atendimento</b> para responder. O prazo de inatividade de 2 horas começará nesse momento.')+'</div>'}`;
  const nextInput=$('#supportReply textarea');if(nextInput){nextInput.value=draft;if(restoreFocus){nextInput.focus();if(selectionStart!=null)nextInput.setSelectionRange(selectionStart,selectionEnd)}nextInput.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('#supportReply').requestSubmit()}};$('#supportReply').onsubmit=sendAdminReply}if($('#startSupport'))$('#startSupport').onclick=startAdminChat;$('#supportStatus').value=conversation.status;$('#supportStatus').onchange=event=>setAdminChatStatus(event.target.value);if(scroll){const box=$('#supportMessages');box.scrollTop=box.scrollHeight}
}
async function sendAdminReply(event){event.preventDefault();const input=$('#supportReply textarea'),body=input.value.trim();if(!body)return;const button=$('#supportReply button');button.disabled=true;const {error}=await supabaseClient.rpc('chat_admin_send',{p_conversation_id:activeChatId,p_body:body});button.disabled=false;if(error){console.error(error);return showToast(error.message||'Não foi possível enviar a resposta.')}input.value='';await loadAdminChats();await loadAdminMessages(true)}
async function startAdminChat(){const button=$('#startSupport');if(button)button.disabled=true;const {error}=await supabaseClient.rpc('chat_admin_start',{p_conversation_id:activeChatId});if(error){if(button)button.disabled=false;return showToast('Não foi possível iniciar o atendimento.')}showToast('Atendimento iniciado.');await loadAdminChats();await loadAdminMessages(true)}
async function setAdminChatStatus(status){const {error}=await supabaseClient.rpc('chat_admin_status',{p_conversation_id:activeChatId,p_status:status});if(error)return showToast('Não foi possível alterar o status.');await loadAdminChats()}
function admin(){return head('Administração','Usuários, acessos e configuração do sistema',`<button class="primary" onclick="openForm('user')">＋ Novo usuário</button>`)+`<div class="grid-2"><div class="panel table-panel" style="margin-top:0"><div class="panel-head"><h3>Usuários e permissões</h3></div><table><thead><tr><th>Usuário</th><th>Email</th><th>Perfil</th><th>Status</th></tr></thead><tbody>${db.users.map(u=>`<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td><span class="badge green">${u.status}</span></td></tr>`).join('')}</tbody></table></div><div class="panel"><div class="panel-head"><h3>Perfis de acesso</h3></div><div class="notice-list"><div class="notice"><span class="notice-icon">♛</span><div><b>Administrador</b><p>Acesso completo a todos os módulos.</p></div></div><div class="notice"><span class="notice-icon">▤</span><div><b>Financeiro</b><p>Vendas, despesas e relatórios financeiros.</p></div></div><div class="notice"><span class="notice-icon">♙</span><div><b>Funcionário</b><p>Operação de vendas e estoque.</p></div></div></div></div></div><div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Categorias e atributos dinâmicos</h3><button class="secondary" onclick="openForm('category')">＋ Adicionar</button></div>${db.categories.map(c=>`<div class="notice"><span class="notice-icon">${c.icon}</span><div><b>${c.name}</b><p>${c.fields.join(' · ')}</p></div></div>`).join('')}</div>`}
const renderers={dashboard,sales,inventory,finance,traffic,customers,partners,commissions,support,reports,admin};
function render(){clearInterval(chatPollTimer);renderNav();$('#content').innerHTML=renderers[page]();if(page==='sales'){const filter=()=>{let q=$('#saleSearch').value.toLowerCase(),st=$('#saleStatus').value,cat=$('#saleCategory').value;$('#salesResult').innerHTML=salesTable(db.sales.filter(s=>(s.client+s.product+(s.contact||'')).toLowerCase().includes(q)&&(!st||s.status===st)&&(!cat||s.category===cat)))};['saleSearch','saleStatus','saleCategory'].forEach(id=>$('#'+id).oninput=filter)}const poll=page==='support'?loadAdminChats:pollChatNotifications;poll();chatPollTimer=setInterval(poll,3000);updateNotifications()}
const forms={
 sale:['Nova venda','Registre a venda e calcule o lucro automaticamente',[['client','Cliente','text'],['contact','Contato','text'],['product','Produto','text'],['category','Categoria','category'],['value','Valor da venda','number'],['cost','Custo do produto','number'],['commission','Comissão','number'],['partnership','Parceria','number'],['payment','Forma de pagamento','select:PIX,Cartão,Boleto,Dinheiro'],['platform','Plataforma','text'],['date','Data','date'],['status','Status','select:Concluída,Pendente,Cancelada']],'sales'],
 account:['Nova conta Roblox','Credenciais e dados do estoque',[['name','Nome da conta','text'],['login','Login','text'],['password','Senha','text'],['email','Email','email'],['emailPassword','Senha do email','text'],['category','Categoria','category'],['buy','Valor de compra','number'],['sell','Valor de venda','number'],['status','Status','select:Disponível,Reservada,Vendida']],'accounts'],
 expense:['Nova despesa','Registre uma saída financeira',[['description','Descrição','text'],['category','Categoria','select:Compra de contas,Compra de itens,Produtos,Tráfego pago,Parcerias,Comissões,Serviços,Hospedagem,Domínio,Ferramentas,Outros'],['value','Valor','number'],['date','Data','date'],['payment','Forma de pagamento','select:PIX,Cartão,Boleto,Dinheiro'],['notes','Observação','textarea']],'expenses'],
 storeFee:['Mensalidade da loja','Cadastre o custo mensal da operação',[['description','Referência (ex.: Agosto/2026)','text'],['value','Valor da mensalidade','number'],['date','Vencimento / data do pagamento','date'],['payment','Forma de pagamento','select:PIX,Cartão,Boleto,Dinheiro'],['notes','Observação','textarea']],'expenses'],
 campaign:['Nova campanha','Acompanhe o investimento em anúncios',[['platform','Plataforma','select:Google Ads,Meta Ads,TikTok Ads'],['name','Nome da campanha','text'],['start','Data inicial','date'],['end','Data final','date'],['value','Valor investido','number'],['notes','Observações','textarea']],'campaigns'],
 partner:['Novo parceiro','Cadastre acordos e vencimentos',[['name','Nome','text'],['contact','Contato','text'],['type','Tipo da parceria','text'],['value','Valor acordado','number'],['frequency','Frequência','select:Semanal,Quinzenal,Mensal,Personalizada'],['due','Próximo vencimento','date'],['status','Status','select:Ativo,Pendente,Inativo']],'partners'],
 commission:['Nova comissão','Relacione o pagamento ao colaborador',[['name','Colaborador / Afiliado','text'],['sale','Venda relacionada','sale'],['value','Valor','number'],['date','Data','date'],['status','Status','select:Pago,Pendente'],['notes','Observação','textarea']],'commissions'],
 category:['Nova categoria','Defina atributos sem alterar o sistema',[['name','Nome da categoria','text'],['icon','Ícone (emoji)','text'],['fields','Atributos (separados por vírgula)','textarea']],'categories'],
 user:['Novo usuário','Configure o acesso ao sistema',[['name','Nome','text'],['email','Email','email'],['role','Perfil','select:Administrador,Funcionário,Financeiro'],['status','Status','select:Ativo,Inativo']],'users']
};
const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const optionalSaleFields=new Set(['contact','partnership','platform','commission','cost']);
function inputField(f,record={}){let [name,label,type]=f,val=record[name]??(type==='date'?today:''),required=optionalSaleFields.has(name)?'':'required';if(type==='category')return `<div class="field"><label>${label}</label><select name="${name}" required>${db.categories.map(c=>`<option ${c.name===val?'selected':''}>${c.name}</option>`).join('')}</select></div>`;if(type==='sale')return `<div class="field"><label>${label}</label><select name="${name}" required>${db.sales.map(s=>`<option value="${s.id}" ${s.id===val?'selected':''}>${s.client} — ${s.product}</option>`).join('')}</select></div>`;if(type.startsWith('select:'))return `<div class="field"><label>${label}</label><select name="${name}">${type.slice(7).split(',').map(x=>`<option ${x===val?'selected':''}>${x}</option>`).join('')}</select></div>`;if(type==='textarea')return `<div class="field full"><label>${label}</label><textarea name="${name}" rows="3">${escapeHtml(val)}</textarea></div>`;return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${escapeHtml(val)}" ${type==='number'?'step="0.01" min="0" inputmode="decimal"':''} ${required}></div>`}
function openForm(type,editId=null){let f=forms[type],collection=f[3],editing=editId?db[collection].find(item=>item.id===editId):null,title=editing?`Alterar ${f[0].replace(/^Nov[oa] /,'').toLowerCase()}`:f[0];$('#modalBody').innerHTML=`<h2>${title}</h2><div class="modal-sub">${editing?'Atualize os dados deste registro.':f[1]}</div><form id="dataForm"><div class="form-grid">${f[2].map(field=>inputField(field,editing||{})).join('')}<div id="dynamicFields" class="field full"></div></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">${editing?'Salvar alterações':'Salvar registro'}</button></div></form>`;$('#modal').classList.add('open');if(type==='account'){let sel=$('[name=category]');const dynamic=()=>{let c=db.categories.find(x=>x.name===sel.value);if(!c)return;$('#dynamicFields').innerHTML=`<label>Atributos de ${c.name}</label><div class="form-grid">${c.fields.map(x=>`<div class="field"><input data-attr="${escapeHtml(x)}" placeholder="${escapeHtml(x)}" value="${escapeHtml(editing?.attrs?.[x]||'')}"></div>`).join('')}</div>`};sel.onchange=dynamic;dynamic()}$('#dataForm').onsubmit=e=>{e.preventDefault();let obj=Object.fromEntries(new FormData(e.target));f[2].filter(x=>x[2]==='number').forEach(x=>obj[x[0]]=+(obj[x[0]]||0));obj.id=editing?.id||uid();if(type==='storeFee')obj.category='Mensalidade da loja';if(type==='category')obj.fields=obj.fields.split(',').map(x=>x.trim()).filter(Boolean);if(type==='account')obj.attrs=Object.fromEntries($$('[data-attr]').map(x=>[x.dataset.attr,x.value]).filter(x=>x[1]));if(type==='partner')obj.paid=editing?.paid||0;if(editing){db[collection]=db[collection].map(item=>item.id===editing.id?obj:item)}else db[collection].unshift(obj);save();closeModal();showToast(editing?'Registro alterado com sucesso':'Registro salvo com sucesso');render()}}
/* Implementação anterior preservada apenas durante a resolução do stash.
function inputField(f){let [name,label,type]=f,val=(type==='date'?today:'');if(type==='category')return `<div class="field"><label>${label}</label><select name="${name}" required>${db.categories.map(c=>`<option>${c.name}</option>`).join('')}</select></div>`;if(type==='sale')return `<div class="field"><label>${label}</label><select name="${name}" required>${db.sales.map(s=>`<option value="${s.id}">${s.client} — ${s.product}</option>`).join('')}</select></div>`;if(type.startsWith('select:'))return `<div class="field"><label>${label}</label><select name="${name}">${type.slice(7).split(',').map(x=>`<option>${x}</option>`).join('')}</select></div>`;if(type==='textarea')return `<div class="field full"><label>${label}</label><textarea name="${name}" rows="3"></textarea></div>`;return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${val}" ${type!=='number'?'required':''}></div>`}
function openForm(type){let f=forms[type];$('#modalBody').innerHTML=`<h2>${f[0]}</h2><div class="modal-sub">${f[1]}</div><form id="dataForm"><div class="form-grid">${f[2].map(inputField).join('')}<div id="dynamicFields" class="field full"></div></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar registro</button></div></form>`;$('#modal').classList.add('open');if(type==='account'){let sel=$('[name=category]');const dynamic=()=>{let c=db.categories.find(x=>x.name===sel.value);$('#dynamicFields').innerHTML=`<label>Atributos de ${c.name}</label><div class="form-grid">${c.fields.map(x=>`<div class="field"><input data-attr="${x}" placeholder="${x}"></div>`).join('')}</div>`};sel.onchange=dynamic;dynamic()}$('#dataForm').onsubmit=async e=>{e.preventDefault();let obj=Object.fromEntries(new FormData(e.target));f[2].filter(x=>x[2]==='number').forEach(x=>obj[x[0]]=+(obj[x[0]]||0));obj.id=uid();if(type==='category')obj.fields=obj.fields.split(',').map(x=>x.trim()).filter(Boolean);if(type==='account')obj.attrs=Object.fromEntries($$('[data-attr]').map(x=>[x.dataset.attr,x.value]).filter(x=>x[1]));if(type==='partner')obj.paid=0;db[f[3]].unshift(obj);const synced=await save();closeModal();showToast(synced?'Registro salvo com sucesso':'Registro salvo localmente; sincronização pendente');render()}}
*/
function closeModal(){$('#modal').classList.remove('open')}
async function removeItem(type,id){if(confirm('Deseja remover este registro?')){db[type]=db[type].filter(x=>x.id!==id);const synced=await save();render();showToast(synced?'Registro removido':'Registro removido localmente; sincronização pendente')}}
function showToast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2500)}
function updateNotifications(){let n=db.partners.filter(p=>p.status==='Pendente').length+db.commissions.filter(c=>c.status==='Pendente').length;$('#notifyCount').textContent=n;$('#notifyCount').style.display=n?'block':'none'}
function openExportModal(){
  const {start,end}=dashboardPeriod;
  $('#modalBody').innerHTML=`<h2>Exportar relatório Excel</h2><div class="modal-sub">Escolha o período que será incluído no arquivo.</div><form id="exportForm"><div class="form-grid"><div class="field"><label>Data inicial</label><input name="start" type="date" value="${start}" required></div><div class="field"><label>Data final</label><input name="end" type="date" value="${end}" required></div></div><div class="export-info"><b>O arquivo terá quatro abas:</b><span>Resumo, vendas, despesas detalhadas e evolução mensal.</span></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Baixar .xlsx</button></div></form>`;
  $('#modal').classList.add('open');
  $('#exportForm').onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target));if(values.start>values.end)return showToast('Informe um período válido.');exportExcel(values.start,values.end)};
}
function exportExcel(start,end){
  if(!window.XLSX)return showToast('Não foi possível carregar o gerador de Excel.');
  const rows=db.sales.filter(s=>inPeriod(s.date,start,end)),summary=financialRange(start,end),months=dashboardMonths(start,end),wb=XLSX.utils.book_new();
  const summaryData=[['RELATÓRIO PIXELSALE'],['Período',`${date(start)} a ${date(end)}`],['Gerado em',new Date().toLocaleString('pt-BR')],[],['INDICADOR','VALOR'],['Faturamento bruto',summary.revenue],['Custo dos produtos nas vendas',summary.saleCosts],['Lucro bruto',summary.grossProfit],['Despesas financeiras',summary.expenses],['  Produtos',summary.productCosts],['  Tráfego',summary.traffic],['  Parcerias',summary.partnerships],['  Comissões',summary.commissions],['  Mensalidade da loja',summary.storeFees],['  Outros',summary.other],['Lucro líquido',summary.net],['Total de vendas',summary.sales.length],['Vendas concluídas',summary.completed.length],['Ticket médio',summary.completed.length?summary.revenue/summary.completed.length:0]];
  const wsSummary=XLSX.utils.aoa_to_sheet(summaryData);wsSummary['!cols']=[{wch:34},{wch:22}];
  for(let row=6;row<=16;row++){const cell=wsSummary[`B${row}`];if(cell)cell.z='R$ #,##0.00'}
  if(wsSummary.B19)wsSummary.B19.z='R$ #,##0.00';
  const salesData=[['Cliente','Contato','Produto','Categoria','Valor da venda','Custo do produto','Lucro da venda','Comissão','Parceria','Pagamento','Plataforma','Data','Status'],...rows.map(s=>[s.client,s.contact||'',s.product,s.category,Number(s.value||0),Number(s.cost||0),profit(s),Number(s.commission||0),Number(s.partnership||0),s.payment,s.platform||'',new Date(`${s.date}T12:00:00`),s.status])];
  const wsSales=XLSX.utils.aoa_to_sheet(salesData,{cellDates:true});wsSales['!cols']=[{wch:24},{wch:20},{wch:48},{wch:22},{wch:16},{wch:18},{wch:17},{wch:14},{wch:14},{wch:14},{wch:18},{wch:13},{wch:14}];wsSales['!autofilter']={ref:`A1:M${Math.max(1,salesData.length)}`};
  for(let row=2;row<=salesData.length;row++){for(const col of ['E','F','G','H','I'])wsSales[`${col}${row}`].z='R$ #,##0.00';wsSales[`L${row}`].z='dd/mm/yyyy'}
  const expenseRows=[
    ...expensesInRange(start,end).map(e=>({source:e.generated?'Mensalidade automática':'Financeiro',category:e.category,description:e.description,value:Number(e.value||0),date:e.date,payment:e.payment||'',status:e.generated?`Renovação automática · ciclo ${e.cycle+1}`:(e.notes||'')})),
    ...db.partners.filter(p=>inPeriod(recordCreatedDate(p),start,end)&&p.status!=='Inativo').map(p=>({source:'Parcerias',category:'Parcerias',description:p.name,value:Number(p.value||0),date:recordCreatedDate(p),due:p.due||'',payment:p.frequency||'',status:p.status||''})),
    ...db.campaigns.filter(c=>inPeriod(c.start,start,end)).map(c=>({source:'Tráfego pago',category:'Tráfego pago',description:c.name,value:Number(c.value||0),date:c.start,payment:c.platform||'',status:c.notes||''})),
    ...db.commissions.filter(c=>inPeriod(c.date,start,end)&&c.status==='Pago').map(c=>({source:'Comissões',category:'Comissões',description:c.name,value:Number(c.value||0),date:c.date,payment:'',status:c.status||''}))
  ].sort((a,b)=>b.date.localeCompare(a.date));
  const expensesData=[['Origem','Categoria','Descrição','Valor','Data do registro','Vencimento','Pagamento / Frequência','Status / Observação'],...expenseRows.map(e=>[e.source,e.category,e.description,e.value,new Date(`${e.date}T12:00:00`),e.due?new Date(`${e.due}T12:00:00`):'',e.payment,e.status])];
  const wsExpenses=XLSX.utils.aoa_to_sheet(expensesData,{cellDates:true});wsExpenses['!cols']=[{wch:18},{wch:20},{wch:40},{wch:16},{wch:17},{wch:13},{wch:24},{wch:24}];wsExpenses['!autofilter']={ref:`A1:H${Math.max(1,expensesData.length)}`};
  for(let row=2;row<=expensesData.length;row++){wsExpenses[`D${row}`].z='R$ #,##0.00';wsExpenses[`E${row}`].z='dd/mm/yyyy';if(wsExpenses[`F${row}`])wsExpenses[`F${row}`].z='dd/mm/yyyy'}
  const evolutionData=[['Mês','Faturamento','Custo dos produtos','Lucro bruto','Despesas','Lucro líquido'],...months.map(m=>[m.label,m.revenue,m.saleCosts,m.grossProfit,m.expenses,m.net])];
  const wsEvolution=XLSX.utils.aoa_to_sheet(evolutionData);wsEvolution['!cols']=[{wch:16},{wch:18},{wch:20},{wch:18},{wch:18},{wch:18}];wsEvolution['!autofilter']={ref:`A1:F${evolutionData.length}`};
  for(let row=2;row<=evolutionData.length;row++)for(const col of ['B','C','D','E','F'])wsEvolution[`${col}${row}`].z='R$ #,##0.00';
  XLSX.utils.book_append_sheet(wb,wsSummary,'Resumo');XLSX.utils.book_append_sheet(wb,wsSales,'Vendas');XLSX.utils.book_append_sheet(wb,wsExpenses,'Despesas');XLSX.utils.book_append_sheet(wb,wsEvolution,'Evolução mensal');
  XLSX.writeFile(wb,`PixelSale_${start}_a_${end}.xlsx`,{compression:true,cellStyles:true});closeModal();showToast('Relatório Excel gerado com sucesso.');
}
$('#modalClose').onclick=closeModal;$('#modal').onclick=e=>{if(e.target===$('#modal'))closeModal()};$('#quickAdd').onclick=()=>openForm('sale');$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');$('#notifyBtn').onclick=()=>{let pending=[...db.partners.filter(p=>p.status==='Pendente').map(p=>`Parceiro: ${p.name}`),...db.commissions.filter(c=>c.status==='Pendente').map(c=>`Comissão: ${c.name}`)];$('#modalBody').innerHTML=`<h2>Central de notificações</h2><div class="modal-sub">Pendências que precisam de atenção</div><div class="notice-list">${pending.map(x=>`<div class="notice"><span class="notice-icon">!</span><div><b>${x}</b><p>Pagamento pendente ou próximo do vencimento.</p></div></div>`).join('')||'<div class="empty">Tudo em dia por aqui.</div>'}</div>`;$('#modal').classList.add('open')};$('#globalSearch').onkeydown=e=>{if(e.key==='Enter'){page='sales';render();$('#saleSearch').value=e.target.value;$('#saleSearch').dispatchEvent(new Event('input'))}};

// O modal só deve fechar por uma ação explícita (fechar, cancelar ou salvar).
$('#modal').onclick=null;
function showApp(){ $('#loginScreen').classList.add('is-hidden');$('#appShell').classList.remove('is-locked');render() }
function showLogin(){ $('#loginScreen').classList.remove('is-hidden');$('#appShell').classList.add('is-locked') }
async function verifiedTotpFactor(){
  const {data,error}=await supabaseClient.auth.mfa.listFactors();
  if(error)throw error;
  return data.totp.find(factor=>factor.status==='verified');
}
async function verifyTotp(factor){
  return new Promise(resolve=>{
    $('#modalBody').innerHTML=`<h2>Confirme seu acesso</h2><div class="modal-sub">Digite o código de 6 dígitos exibido no Google Authenticator.</div><form id="totpVerifyForm"><label class="login-field"><span>Código de verificação</span><input name="code" class="totp-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus></label><div class="login-error" id="totpError"></div><div class="form-actions"><button class="primary">Verificar código</button></div></form>`;
    $('#modal').classList.add('open');
    $('#totpVerifyForm').onsubmit=async event=>{
      event.preventDefault();const button=$('#totpVerifyForm button');button.disabled=true;
      const code=new FormData(event.target).get('code');
      const {error}=await supabaseClient.auth.mfa.challengeAndVerify({factorId:factor.id,code});
      if(error){$('#totpError').textContent='Código inválido ou expirado.';$('#totpError').classList.add('show');button.disabled=false;return}
      closeModal();resolve();
    };
  });
}
async function configureTotp(){
  try{
    const current=await verifiedTotpFactor();
    if(current)return showToast('A verificação em dois fatores já está ativa.');
    const {data,error}=await supabaseClient.auth.mfa.enroll({factorType:'totp',friendlyName:'PixelSale - Administrador'});
    if(error)throw error;
    $('#modalBody').innerHTML=`<h2>Ativar Google Authenticator</h2><div class="modal-sub">Escaneie o QR Code no aplicativo e informe o código gerado.</div><div class="totp-setup"><img src="${data.totp.qr_code}" alt="QR Code para configurar o Google Authenticator"><details><summary>Usar chave manual</summary><code>${escapeHtml(data.totp.secret)}</code></details></div><form id="totpEnrollForm"><label class="login-field"><span>Código de 6 dígitos</span><input name="code" class="totp-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus></label><div class="login-error" id="totpEnrollError"></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Ativar proteção</button></div></form>`;
    $('#modal').classList.add('open');
    $('#totpEnrollForm').onsubmit=async event=>{
      event.preventDefault();const button=$('#totpEnrollForm .primary');button.disabled=true;
      const code=new FormData(event.target).get('code');
      const {error:verifyError}=await supabaseClient.auth.mfa.challengeAndVerify({factorId:data.id,code});
      if(verifyError){$('#totpEnrollError').textContent='Código inválido ou expirado.';$('#totpEnrollError').classList.add('show');button.disabled=false;return}
      closeModal();showToast('Verificação em dois fatores ativada.');
    };
  }catch(error){console.error(error);showToast('Não foi possível configurar o autenticador.');}
}
async function finishLogin(){const factor=await verifiedTotpFactor();if(factor)await verifyTotp(factor);await loadDatabase();showApp()}
$('#loginForm').onsubmit=async e=>{e.preventDefault();let form=Object.fromEntries(new FormData(e.target)),button=$('#loginForm .login-submit');button.disabled=true;const {error}=await supabaseClient.auth.signInWithPassword({email:form.email,password:form.password});if(error){$('#loginError').textContent='Email ou senha inválidos.';$('#loginError').classList.add('show')}else{$('#loginError').classList.remove('show');try{await finishLogin()}catch(loadError){console.error(loadError);showToast('Não foi possível concluir o acesso.')}}button.disabled=false};
$('#togglePassword').onclick=()=>{let input=$('#loginForm [name=password]');input.type=input.type==='password'?'text':'password'};
$('#forgotPassword').onclick=async()=>{let email=$('#loginForm [name=email]').value;if(!email)return showToast('Informe seu email.');const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin});showToast(error?'Não foi possível enviar a recuperação.':'Confira seu email para redefinir a senha.')};
$('#logoutBtn').onclick=async()=>{await supabaseClient.auth.signOut();showLogin()};
$('#mfaBtn').onclick=configureTotp;
async function initializeApp(){
  if('serviceWorker'in navigator)navigator.serviceWorker.register('/service-worker.js').catch(error=>console.error('Falha ao registrar notificações:',error));
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session)return showLogin();
  try{const {data}=await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();if(data.nextLevel==='aal2'&&data.currentLevel!=='aal2')return showLogin();await loadDatabase();showApp()}catch(error){console.error('Falha ao carregar dados do Supabase:',error);showToast('Não foi possível carregar os dados do Supabase.');showLogin()}
}
initializeApp();
