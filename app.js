
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const LS = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};

const KEYS = {
  settings:'dp_settings',
  products:'dp_products',
  sales:'dp_sales',
  clients:'dp_clients',
  invmov:'dp_invmov',
  cash:'dp_cash',
  zmark:'dp_zmark'
};

function uid(){ return 'S' + Math.random().toString(36).slice(2,10) + Date.now().toString(36) }
function todayStr(){ return new Date().toISOString().slice(0,10) }

const DEFAULT_SETTINGS = {
  businessName:"DINAMITA GYM",
  address:"Dirección del gimnasio",
  phone:"55 0000 0000",
  footer:"Gracias por tu compra en Dinamita Gym 💥",
  logo:null,
  taxRate:0,
  currency:"MXN",
  ticketWidth58mm:true,
  paymentMethods:["Efectivo","Tarjeta","Transferencia","Mercado Pago"],
  folioPrefix:"DG-2025-",
  nextFolio:1,
  whatsappPhone:"5643195153",
  whatsappMsg:"Gracias por tu compra en Dinamita Gym 💥 Envíanos tu duda o ticket.",
  showWhatsQR:true
};
const CATEGORIES = ["Suplementos","Accesorios","Membresías","Bebidas"];

const SAMPLE_PRODUCTS = [
  {id:uid(), sku:"PRO-001", name:"Proteína Whey 2lb", price:549, cost:380, category:"Suplementos", stock:8, image:null},
  {id:uid(), sku:"CRE-002", name:"Creatina Monohidrato 300g", price:399, cost:250, category:"Suplementos", stock:12, image:null},
  {id:uid(), sku:"GUA-003", name:"Guantes Entrenamiento", price:199, cost:90, category:"Accesorios", stock:15, image:null},
  {id:uid(), sku:"MEN-001", name:"Mensualidad (1 mes)", price:300, cost:0, category:"Membresías", stock:9999, image:null},
];

function ensureData(){
  if(!LS.get(KEYS.settings)) LS.set(KEYS.settings, DEFAULT_SETTINGS);
  if(!LS.get(KEYS.products)) LS.set(KEYS.products, SAMPLE_PRODUCTS);
  if(!LS.get(KEYS.sales)) LS.set(KEYS.sales, []);
  if(!LS.get(KEYS.clients)) LS.set(KEYS.clients, []);
  if(!LS.get(KEYS.invmov)) LS.set(KEYS.invmov, []);
  if(!LS.get(KEYS.cash)) LS.set(KEYS.cash, []);
  if(!LS.get(KEYS.zmark)) LS.set(KEYS.zmark, null);
}
ensureData();

const State = { route:'ventas', cart:[] };

function formatCurrency(n){
  const s = LS.get(KEYS.settings, DEFAULT_SETTINGS);
  return n.toLocaleString('es-MX',{style:'currency',currency:s.currency||'MXN'});
}
function genFolio(){
  const s = LS.get(KEYS.settings, DEFAULT_SETTINGS);
  const n = s.nextFolio || 1;
  const folio = s.folioPrefix + String(n).padStart(4,'0');
  s.nextFolio = n + 1;
  LS.set(KEYS.settings, s);
  return folio;
}

function navTo(route){
  State.route = route;
  $$(".nav button").forEach(b=> b.classList.toggle('active', b.dataset.route===route));
  $$(".view").forEach(v=> v.style.display = (v.id===route?'block':'none'));
  if(route==='ventas') renderVentas();
  if(route==='catalogo') renderCatalogo();
  if(route==='inventario') renderInventario();
  if(route==='clientes') renderClientes();
  if(route==='historial') renderHistorial();
  if(route==='config') renderConfig();
}

function imgToBase64(file, cb){ const r=new FileReader(); r.onload=e=>cb(e.target.result); r.readAsDataURL(file); }
function q(msg){ alert(msg); }

/* === Ventas === */
function addToCart(prod){
  const it = State.cart.find(i=>i.id===prod.id);
  if(it) it.qty++;
  else State.cart.push({id:prod.id, name:prod.name, price:prod.price, qty:1});
  renderCart();
}
function changeQty(id, qty){
  const it = State.cart.find(i=>i.id===id);
  if(!it) return;
  it.qty = Math.max(1, parseInt(qty||1));
  renderCart();
}
function removeFromCart(id){ State.cart = State.cart.filter(i=>i.id!==id); renderCart(); }
function cartTotals(){
  const s=LS.get(KEYS.settings, DEFAULT_SETTINGS);
  const subtotal = State.cart.reduce((a,b)=>a + b.price*b.qty,0);
  const tax = subtotal * (s.taxRate/100);
  const total = subtotal + tax;
  return {subtotal,tax,total};
}
function renderCart(){
  const wrap=$("#cartLines"); wrap.innerHTML="";
  State.cart.forEach(line=>{
    const div=document.createElement('div'); div.className='line';
    div.innerHTML=`<span>${line.name} x <input type="number" min="1" value="${line.qty}" onchange="changeQty('${line.id}',this.value)"/></span>
    <b>${formatCurrency(line.price*line.qty)}</b>
    <button class="icon" onclick="removeFromCart('${line.id}')">🗑️</button>`;
    wrap.appendChild(div);
  });
  const t=cartTotals();
  $("#subtotal").textContent=formatCurrency(t.subtotal);
  $("#tax").textContent=formatCurrency(t.tax);
  $("#total").textContent=formatCurrency(t.total);
  $("#btnCobrar").disabled=State.cart.length===0;
}
function renderVentas(){
  const prods = LS.get(KEYS.products, []);
  const q = $("#searchVenta").value?.toLowerCase() || "";
  const cat = $("#filterCatVenta").value || "all";
  const grid = $("#ventaGrid"); grid.innerHTML="";
  prods.filter(p=> (cat==='all' || p.category===cat) && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
    .forEach(p=>{
      const card=document.createElement('div'); card.className='card';
      const img = p.image? `<img src="${p.image}"/>`:`<div style="height:140px;border-radius:10px;background:#141418;display:flex;align-items:center;justify-content:center">🛒</div>`;
      card.innerHTML=`${img}
        <h3>${p.name}</h3>
        <div class="small">${p.sku} • ${p.category}</div>
        <div class="row" style="align-items:center;justify-content:space-between;margin-top:6px">
          <b>${formatCurrency(p.price)}</b>
          <button class="btn" onclick='addToCart(${JSON.stringify(p)})'>Agregar</button>
        </div>`;
      grid.appendChild(card);
    });
  renderCart();
}
function openCobro(){
  const s = LS.get(KEYS.settings, DEFAULT_SETTINGS);
  const methods = s.paymentMethods||[];
  const list = $("#payMethods"); list.innerHTML="";
  const row = (i)=>`<div class="row"><div class="col"><label>Método</label><select id="pm_${i}">${methods.map(m=>`<option>${m}</option>`).join("")}</select></div>
    <div class="col"><label>Monto</label><input type="number" id="amt_${i}" min="0" step="0.01"/></div></div>`;
  list.innerHTML = row(0)+row(1);
  $("#modalCobro").style.display="flex";
  $("#recibidoDe").value="";
}
function confirmarCobro(){
  const t=cartTotals();
  const methods=[];
  for(let i=0;i<6;i++){
    const pm=$("#pm_"+i), amt=$("#amt_"+i);
    if(pm && amt && parseFloat(amt.value)>0){
      methods.push({method:pm.value, amount:parseFloat(amt.value)});
    }
  }
  const sum = methods.reduce((a,b)=>a+b.amount,0);
  if(Math.abs(sum - t.total) > 0.01){ q("Los montos de pago no coinciden con el total."); return; }
  const folio = genFolio();
  const sale = {
    id: folio,
    ts: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(State.cart)),
    subtotal:t.subtotal, tax:t.tax, total:t.total,
    payments: methods, customerName: $("#recibidoDe").value || null
  };
  const products = LS.get(KEYS.products, []);
  sale.items.forEach(it=>{
    const p=products.find(pp=>pp.id===it.id);
    if(p && p.category!=="Membresías"){ p.stock = Math.max(0,(p.stock||0)-it.qty); }
  });
  LS.set(KEYS.products, products);
  const sales = LS.get(KEYS.sales, []); sales.unshift(sale); LS.set(KEYS.sales, sales);
  // caja: entrada automática
  const cash = LS.get(KEYS.cash, []);
  cash.unshift({id:uid(), ts:sale.ts, type:"Entrada", amount:sale.total, note:"Venta "+sale.id});
  LS.set(KEYS.cash, cash);
  State.cart = [];
  $("#modalCobro").style.display="none";
  renderVentas(); renderHistorial();
  printTicket(sale);
}
function cancelCobro(){ $("#modalCobro").style.display="none"; }

/* Ticket */
function printTicket(sale){
  const s = LS.get(KEYS.settings, DEFAULT_SETTINGS);
  const w = window.open("", "PRINT", "width=420,height=620");
  const styles = document.querySelector('link[href="css/styles.css"]').outerHTML;
  const logo = s.logo ? `<img src="${s.logo}" style="max-width:100px;display:block;margin:0 auto 6px auto" />` : `<div style="text-align:center;font-weight:900">${s.businessName.slice(0,1)}</div>`;
  const waMsg = encodeURIComponent(s.whatsappMsg || "");
  const waUrl = `https://wa.me/52${(s.whatsappPhone||'').replace(/\D/g,'')}?text=${waMsg}`;
  const qr = s.showWhatsQR ? `<div class="center" style="margin:8px 0"><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(waUrl)}"/></div>` : "";
  let html = `<html><head>${styles}<title>Ticket</title></head><body>
  <div class="ticket">
    <div class="center">${logo}</div>
    <div class="center">
      <h1>${s.businessName}</h1>
      <div class="muted">${s.address||""}</div>
      <div class="muted">${s.phone||""}</div>
    </div>
    <hr/>
    <div class="muted">Folio: <b>${sale.id}</b> • Fecha: ${new Date(sale.ts).toLocaleString('es-MX')}</div>
    <table>`;
  sale.items.forEach(it=>{
    html += `<tr><td>${it.name} x ${it.qty}</td><td style="text-align:right">${formatCurrency(it.price*it.qty)}</td></tr>`;
  });
  html += `</table>
    <table class="totals">
      <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(sale.subtotal)}</td></tr>
      <tr><td>Impuestos</td><td style="text-align:right">${formatCurrency(sale.tax)}</td></tr>
      <tr><td><b>Total</b></td><td style="text-align:right"><b>${formatCurrency(sale.total)}</b></td></tr>
    </table>
    <hr/>
    <div class="muted">Pagos: ${sale.payments.map(p=>`${p.method} ${formatCurrency(p.amount)}`).join(" + ")}</div>
    ${sale.customerName?`<div class="muted">Cliente: ${sale.customerName}</div>`:""}
    ${qr}
    <div class="center" style="margin-top:8px">${s.footer||""}</div>
  </div>
  <script>window.onload=()=>{ window.print(); setTimeout(()=>window.close(), 300); }</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}

/* === Catálogo === */
function renderCatalogo(){
  const prods = LS.get(KEYS.products, []);
  const tbody=$("#catBody"); tbody.innerHTML="";
  prods.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td>
    <td>${formatCurrency(p.price)}</td><td>${p.stock??0}</td>
    <td><button class="icon" onclick="editProduct('${p.id}')">✏️</button> <button class="icon" onclick="deleteProduct('${p.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
  $("#pCategory").innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");
}
function clearProdForm(){ $("#pId").value=""; $("#pSku").value=""; $("#pName").value=""; $("#pPrice").value=""; $("#pCost").value=""; $("#pStock").value=""; $("#pImage").value=""; }
function saveProduct(){
  const id = $("#pId").value || uid();
  const sku=$("#pSku").value.trim();
  const name=$("#pName").value.trim();
  const price=parseFloat($("#pPrice").value||0);
  const cost=parseFloat($("#pCost").value||0);
  const category=$("#pCategory").value;
  const stock=parseInt($("#pStock").value||0);
  const prods = LS.get(KEYS.products, []);
  const idx = prods.findIndex(p=>p.id===id);
  const update = (img)=>{
    const obj={id, sku, name, price, cost, category, stock, image:img};
    if(idx>=0) prods[idx]=obj; else prods.unshift(obj);
    LS.set(KEYS.products, prods); clearProdForm(); renderCatalogo();
  };
  const file=$("#pImage").files[0];
  if(file){ imgToBase64(file, b64=>update(b64)); } else { const prev=idx>=0?prods[idx].image:null; update(prev); }
}
function editProduct(id){
  const p = LS.get(KEYS.products, []).find(pp=>pp.id===id);
  if(!p) return;
  $("#pId").value=p.id; $("#pSku").value=p.sku; $("#pName").value=p.name;
  $("#pPrice").value=p.price; $("#pCost").value=p.cost; $("#pCategory").value=p.category;
  $("#pStock").value=p.stock??0; window.scrollTo({top:0,behavior:'smooth'});
}
function deleteProduct(id){
  if(!confirm("¿Eliminar producto?")) return;
  const prods = LS.get(KEYS.products, []);
  LS.set(KEYS.products, prods.filter(p=>p.id!==id)); renderCatalogo();
}
function exportProductosCSV(){
  const prods = LS.get(KEYS.products, []);
  const rows = [["id","sku","name","price","cost","category","stock","image"]].concat(
    prods.map(p=>[p.id,p.sku,p.name,p.price,p.cost,p.category,p.stock??0,p.image??""])
  ); downloadCSV(rows,"productos.csv");
}
function importProductosCSV(file){
  const reader = new FileReader();
  reader.onload = e=>{
    const lines = e.target.result.split(/\r?\n/).filter(Boolean);
    const headers = lines.shift().split(",").map(h=>h.replace(/^"|"$/g,""));
    const idx = (h)=> headers.indexOf(h);
    const prods = LS.get(KEYS.products, []);
    lines.forEach(line=>{
      const cols = line.match(/("([^"]|"")*"|[^,]+)/g).map(c=>c.replace(/^"|"$/g,"").replace(/""/g,'"'));
      const id = cols[idx("id")] || uid();
      const obj = {
        id,
        sku: cols[idx("sku")]||"",
        name: cols[idx("name")]||"",
        price: parseFloat(cols[idx("price")]||0),
        cost: parseFloat(cols[idx("cost")]||0),
        category: cols[idx("category")]||"Suplementos",
        stock: parseInt(cols[idx("stock")]||0),
        image: cols[idx("image")]||null
      };
      const i = prods.findIndex(p=>p.id===id);
      if(i>=0) prods[i]=obj; else prods.push(obj);
    });
    LS.set(KEYS.products, prods); renderCatalogo(); alert("Productos importados");
  };
  reader.readAsText(file);
}

/* === Inventario === */
function renderInventario(){
  const prods = LS.get(KEYS.products, []);
  const tbody=$("#invBody"); tbody.innerHTML="";
  prods.forEach(p=>{
    const low = (p.stock??0) <= 2 && p.category!=="Membresías";
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td>
      <td>${p.stock??0} ${low?'<span class="badge" style="background:#f59e0b;color:#111">Bajo</span>':''}</td>
      <td><div class="row"><input type="number" id="adj_${p.id}" placeholder="+/-"/><button class="btn secondary" onclick="ajustarInv('${p.id}')">Aplicar</button></div></td>`;
    tbody.appendChild(tr);
  });
}
function ajustarInv(id){
  const prods = LS.get(KEYS.products, []);
  const p = prods.find(pp=>pp.id===id);
  if(!p) return;
  const val = parseInt(($("#adj_"+id).value||"0"),10);
  if(!Number.isFinite(val) || val===0){ q("Indica un ajuste, positivo o negativo."); return; }
  p.stock = Math.max(0,(p.stock||0)+val);
  LS.set(KEYS.products, prods);
  const inv = LS.get(KEYS.invmov, []);
  inv.unshift({id:uid(), ts:new Date().toISOString(), prodId:id, delta:val});
  LS.set(KEYS.invmov, inv);
  renderInventario();
}

/* === Clientes con vigencia === */
function renderClientes(){
  const list = LS.get(KEYS.clients, []);
  const tbody=$("#cliBody"); tbody.innerHTML="";
  const today = todayStr();
  list.forEach(c=>{
    const vig = c.vigencia || "";
    let badge = `<span class="status-badge">Sin vigencia</span>`;
    if(vig){
      badge = (vig >= today) ? `<span class="status-badge status-ok">VIGENTE ${vig}</span>`
                             : `<span class="status-badge status-bad">VENCIDO ${vig}</span>`;
    }
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${c.name}</td><td>${c.phone||""}</td><td>${c.email||""}</td><td>${badge}</td>
    <td><button class="icon" onclick="editCliente('${c.id}')">✏️</button> <button class="icon" onclick="deleteCliente('${c.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
}
function clearClienteForm(){
  $("#cId").value=""; $("#cName").value=""; $("#cPhone").value=""; $("#cEmail").value="";
  $("#cVig").value=""; $("#cCert").checked=false; $("#cAuto").checked=false;
}
function saveCliente(){
  const id = $("#cId").value || uid();
  const obj = {
    id, name: $("#cName").value.trim(),
    phone: $("#cPhone").value.trim(),
    email: $("#cEmail").value.trim(),
    certificado: $("#cCert").checked,
    autoentrena: $("#cAuto").checked,
    vigencia: $("#cVig").value || null
  };
  const list = LS.get(KEYS.clients, []);
  const idx = list.findIndex(x=>x.id===id);
  if(idx>=0) list[idx]=obj; else list.unshift(obj);
  LS.set(KEYS.clients, list);
  clearClienteForm(); renderClientes();
}
function editCliente(id){
  const c = LS.get(KEYS.clients, []).find(x=>x.id===id);
  if(!c) return;
  $("#cId").value=c.id; $("#cName").value=c.name; $("#cPhone").value=c.phone||""; $("#cEmail").value=c.email||"";
  $("#cCert").checked=!!c.certificado; $("#cAuto").checked=!!c.autoentrena; $("#cVig").value=c.vigencia||"";
  window.scrollTo({top:0,behavior:'smooth'});
}
function deleteCliente(id){
  if(!confirm("¿Eliminar cliente?")) return;
  const list = LS.get(KEYS.clients, []);
  LS.set(KEYS.clients, list.filter(c=>c.id!==id)); renderClientes();
}
function exportClientesCSV(){
  const list=LS.get(KEYS.clients, []);
  const rows=[["id","name","phone","email","certificado","autoentrena","vigencia"]].concat(
    list.map(c=>[c.id,c.name,c.phone||"",c.email||"",c.certificado?"Sí":"No",c.autoentrena?"Sí":"No",c.vigencia||""])
  ); downloadCSV(rows,"clientes.csv");
}

/* === Historial + Caja + Cortes === */
function renderHistorial(){
  const sales=LS.get(KEYS.sales, []);
  const tbody=$("#hisBody"); tbody.innerHTML="";
  sales.forEach(s=>{
    const tr=document.createElement('tr');
    const fecha=new Date(s.ts).toLocaleString('es-MX');
    tr.innerHTML=`<td>${s.id}</td><td>${fecha}</td><td>${s.customerName||""}</td><td>${formatCurrency(s.total)}</td>
      <td><button class="icon" onclick='reimprimir("${s.id}")'>🧾</button></td>`;
    tbody.appendChild(tr);
  });
  const hoy = todayStr();
  const totalHoy = sales.filter(s=>s.ts.slice(0,10)===hoy).reduce((a,b)=>a+b.total,0);
  $("#totalHoy").textContent = formatCurrency(totalHoy);

  // Caja
  const cash=LS.get(KEYS.cash, []);
  const tbody2=$("#cashBody"); tbody2.innerHTML="";
  let saldo=0;
  cash.forEach(m=>{ saldo += (m.type==="Entrada"?m.amount:-m.amount); });
  cash.forEach(m=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${new Date(m.ts).toLocaleString('es-MX')}</td><td>${m.type}</td><td>${formatCurrency(m.amount)}</td><td>${m.note||""}</td>`;
    tbody2.appendChild(tr);
  });
  $("#saldoCaja").textContent = formatCurrency(saldo);
}
function reimprimir(id){
  const sale = LS.get(KEYS.sales, []).find(s=>s.id===id);
  if(sale) printTicket(sale);
}
function addMovimientoCaja(){
  const tipo=$("#cType").value;
  const monto=parseFloat($("#cAmount").value||0);
  const note=$("#cNote").value.trim();
  if(monto<=0){ q("Monto inválido."); return; }
  const cash=LS.get(KEYS.cash, []);
  cash.unshift({id:uid(), ts:new Date().toISOString(), type:tipo, amount:monto, note});
  LS.set(KEYS.cash, cash);
  $("#cAmount").value=""; $("#cNote").value="";
  renderHistorial();
}
function exportVentasCSV(){
  const sales=LS.get(KEYS.sales, []);
  const rows=[["Folio","Fecha","Cliente","Subtotal","Impuestos","Total","Pagos"]].concat(
    sales.map(s=>[s.id,new Date(s.ts).toLocaleString('es-MX'),s.customerName||"",s.subtotal,s.tax,s.total,s.payments.map(p=>`${p.method}:${p.amount}`).join("|")])
  ); downloadCSV(rows,"ventas.csv");
}
function corteX(){
  const since = LS.get(KEYS.zmark, null);
  const sales=LS.get(KEYS.sales, []);
  const filter = since? (s=> new Date(s.ts) > new Date(since)) : (s=>true);
  const subset=sales.filter(filter);
  const total = subset.reduce((a,b)=>a+b.total,0);
  alert(`Corte X\nVentas: ${subset.length}\nTotal: ${formatCurrency(total)}\n(Desde: ${since||'inicio'})`);
}
function corteZ(){
  const now=new Date().toISOString();
  LS.set(KEYS.zmark, now);
  alert("Corte Z realizado. A partir de ahora los siguientes cortes considerarán este punto como inicio.");
}

/* === Util CSV/Backup === */
function downloadCSV(rows, filename){
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download=filename; link.click();
}
function respaldoJSON(){
  const data = {
    settings: LS.get(KEYS.settings, {}),
    products: LS.get(KEYS.products, []),
    sales: LS.get(KEYS.sales, []),
    clients: LS.get(KEYS.clients, []),
    invmov: LS.get(KEYS.invmov, []),
    cash: LS.get(KEYS.cash, []),
    zmark: LS.get(KEYS.zmark, null)
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='respaldo_dinamita_pos.json'; a.click();
}
function restaurarJSON(file){
  const r=new FileReader();
  r.onload = e=>{
    const data = JSON.parse(e.target.result||"{}");
    if(data.settings) LS.set(KEYS.settings, data.settings);
    if(Array.isArray(data.products)) LS.set(KEYS.products, data.products);
    if(Array.isArray(data.sales)) LS.set(KEYS.sales, data.sales);
    if(Array.isArray(data.clients)) LS.set(KEYS.clients, data.clients);
    if(Array.isArray(data.invmov)) LS.set(KEYS.invmov, data.invmov);
    if(Array.isArray(data.cash)) LS.set(KEYS.cash, data.cash);
    if('zmark' in data) LS.set(KEYS.zmark, data.zmark);
    alert("Datos restaurados");
    renderVentas(); renderCatalogo(); renderInventario(); renderClientes(); renderHistorial(); renderConfig();
  };
  r.readAsText(file);
}

/* === Config === */
function renderConfig(){
  const s=LS.get(KEYS.settings, DEFAULT_SETTINGS);
  $("#bName").value=s.businessName||"";
  $("#bAddr").value=s.address||"";
  $("#bPhone").value=s.phone||"";
  $("#bFooter").value=s.footer||"";
  $("#bTax").value=s.taxRate||0;
  $("#bCurrency").value=s.currency||"MXN";
  $("#b58mm").checked=!!s.ticketWidth58mm;
  $("#payList").value=(s.paymentMethods||[]).join(", ");
  $("#folioPrefix").value=s.folioPrefix||"DG-2025-";
  $("#nextFolio").value=s.nextFolio||1;
  $("#waPhone").value=s.whatsappPhone||"";
  $("#waMsg").value=s.whatsappMsg||"";
  $("#waQR").checked=!!s.showWhatsQR;
  const logo = s.logo ? `<img src="${s.logo}" style="height:60px;border-radius:8px;border:1px solid #ddd;background:#fff;padding:6px" />` : `<span class="small">Sin logo</span>`;
  $("#logoPreview").innerHTML = logo;
}
function saveConfig(){
  const s=LS.get(KEYS.settings, DEFAULT_SETTINGS);
  s.businessName=$("#bName").value.trim();
  s.address=$("#bAddr").value.trim();
  s.phone=$("#bPhone").value.trim();
  s.footer=$("#bFooter").value.trim();
  s.taxRate=parseFloat($("#bTax").value||0);
  s.currency=$("#bCurrency").value||"MXN";
  s.ticketWidth58mm=$("#b58mm").checked;
  s.paymentMethods=$("#payList").value.split(",").map(x=>x.trim()).filter(Boolean);
  s.folioPrefix=$("#folioPrefix").value.trim()||"DG-2025-";
  s.nextFolio=parseInt($("#nextFolio").value||1);
  s.whatsappPhone=$("#waPhone").value.trim();
  s.whatsappMsg=$("#waMsg").value.trim();
  s.showWhatsQR=$("#waQR").checked;
  const file=$("#bLogo").files[0];
  if(file){ imgToBase64(file, b64=>{ s.logo=b64; LS.set(KEYS.settings,s); renderConfig(); }); }
  else { LS.set(KEYS.settings,s); renderConfig(); }
  alert("Configuración guardada");
}

/* === Init === */
window.addEventListener('DOMContentLoaded',()=>{
  $("#filterCatVenta").innerHTML = `<option value="all">Todo</option>` + CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");
  renderVentas(); renderCatalogo(); renderInventario(); renderClientes(); renderHistorial(); renderConfig();
  $$(".nav button").forEach(b=> b.addEventListener('click', ()=> navTo(b.dataset.route) ));
});
