// === Sayn Barcode Generator PWA ===
// کاملاً آفلاین - ذخیره در localStorage

const STORAGE_KEY = 'sayn_products';
let products = [];
let editingId = null;
let currentProduct = null;

// === Init ===
window.addEventListener('load', () => {
  loadProducts();
  renderProducts();
  updateStats();
  registerSW();
  window.addEventListener('online', () => document.getElementById('offlineBadge').classList.remove('visible'));
  window.addEventListener('offline', () => document.getElementById('offlineBadge').classList.add('visible'));
  if (!navigator.onLine) document.getElementById('offlineBadge').classList.add('visible');
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// === Storage ===
function loadProducts() {
  try {
    products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { products = []; }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function genBarcode() {
  // Generate unique 13-digit barcode
  const prefix = '2000'; // shop prefix
  const rand = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + rand;
}

// === CRUD ===
function saveProduct() {
  const name = document.getElementById('pName').value.trim();
  if (!name) { toast('⚠️ نام جنس را وارد کنید'); return; }

  const price = parseInt(document.getElementById('pPrice').value) || 0;
  const category = document.getElementById('pCategory').value.trim();
  const barcode = document.getElementById('pBarcode').value.trim() || genBarcode();
  const stock = parseInt(document.getElementById('pStock').value) || 0;

  if (editingId) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx >= 0) {
      products[idx] = { ...products[idx], name, price, category, barcode, stock, updated: Date.now() };
    }
    toast('✅ ویرایش شد');
    editingId = null;
    document.getElementById('formTitle').textContent = '➕ افزودن جنس جدید';
    document.getElementById('cancelBtn').style.display = 'none';
  } else {
    products.push({
      id: genId(), name, price, category, barcode, stock,
      created: Date.now(), updated: Date.now()
    });
    toast('✅ جنس اضافه شد');
  }

  saveProducts();
  renderProducts();
  updateStats();
  clearForm();
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('pName').value = p.name;
  document.getElementById('pPrice').value = p.price || '';
  document.getElementById('pCategory').value = p.category || '';
  document.getElementById('pBarcode').value = p.barcode || '';
  document.getElementById('pStock').value = p.stock || 0;
  document.getElementById('formTitle').textContent = '✏️ ویرایش جنس';
  document.getElementById('cancelBtn').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  editingId = null;
  clearForm();
  document.getElementById('formTitle').textContent = '➕ افزودن جنس جدید';
  document.getElementById('cancelBtn').style.display = 'none';
}

function deleteProduct(id) {
  if (!confirm('آیا از حذف این جنس مطمئن هستید؟')) return;
  products = products.filter(p => p.id !== id);
  saveProducts();
  renderProducts();
  updateStats();
  toast('🗑️ حذف شد');
}

function clearForm() {
  ['pName', 'pPrice', 'pCategory', 'pBarcode', 'pStock'].forEach(id => {
    document.getElementById(id).value = id === 'pStock' ? '0' : '';
  });
}

// === Render ===
function renderProducts() {
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const filtered = products.filter(p =>
    !q || p.name.toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q) ||
    (p.barcode || '').includes(q)
  );

  const el = document.getElementById('productList');
  if (!filtered.length) {
    el.innerHTML = `<div class="empty"><div class="icon">📦</div><div>${q ? 'نتیجه‌ای یافت نشد' : 'هنوز جنسی اضافه نشده'}</div></div>`;
    return;
  }

  el.innerHTML = filtered.map(p => `
    <div class="product-item">
      <div class="product-info">
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-meta">
          ${p.price ? '💰 ' + p.price.toLocaleString('fa') + ' تومان' : ''}
          ${p.category ? ' · 📁 ' + esc(p.category) : ''}
          ${p.stock ? ' · 📦 ' + p.stock : ''}
        </div>
      </div>
      <div class="product-actions">
        <button class="icon-btn barcode" onclick="showBarcode('${p.id}')" title="بارکد">║</button>
        <button class="icon-btn qr" onclick="showQR('${p.id}')" title="QR Code">⊞</button>
        <button class="icon-btn edit" onclick="editProduct('${p.id}')" title="ویرایش">✎</button>
        <button class="icon-btn delete" onclick="deleteProduct('${p.id}')" title="حذف">✕</button>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  document.getElementById('totalCount').textContent = products.length;
  const cats = new Set(products.map(p => p.category).filter(Boolean));
  document.getElementById('categoryCount').textContent = cats.size;
}

// === Barcode ===
function showBarcode(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProduct = p;

  document.getElementById('modalTitle').textContent = '📊 بارکد - ' + p.name;
  document.getElementById('barcodeLabel').textContent = `${p.name} | ${p.barcode}`;
  document.getElementById('barcodeOutput').innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'barcodeSvg';
  document.getElementById('barcodeOutput').appendChild(svg);

  try {
    JsBarcode(svg, p.barcode || genBarcode(), {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: true,
      fontSize: 14,
      margin: 8,
      background: '#ffffff',
      lineColor: '#000000'
    });
  } catch (e) {
    document.getElementById('barcodeOutput').innerHTML = `<div style="color:red">خطا در تولید بارکد: ${e.message}</div>`;
  }

  document.getElementById('barcodeModal').classList.add('active');
}

function showQR(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProduct = p;

  document.getElementById('qrModalTitle').textContent = '📱 QR Code - ' + p.name;
  document.getElementById('qrLabel').textContent = `${p.name} | ${p.price ? p.price.toLocaleString('fa') + ' تومان' : ''}`;
  document.getElementById('qrOutput').innerHTML = '';

  const qrData = JSON.stringify({
    name: p.name,
    price: p.price,
    barcode: p.barcode,
    category: p.category
  });

  new QRCode(document.getElementById('qrOutput'), {
    text: qrData,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  document.getElementById('qrModal').classList.add('active');
}

// === Download ===
function downloadBarcode() {
  const svg = document.getElementById('barcodeSvg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  canvas.width = svg.width.baseVal.value * 2;
  canvas.height = svg.height.baseVal.value * 2;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.download = `barcode-${currentProduct?.name || 'unknown'}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast('📥 دانلود شد');
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function downloadQR() {
  const img = document.querySelector('#qrOutput img');
  if (!img) return;
  const a = document.createElement('a');
  a.download = `qr-${currentProduct?.name || 'unknown'}.png`;
  a.href = img.src;
  a.click();
  toast('📥 دانلود شد');
}

function printBarcode() {
  const svg = document.getElementById('barcodeSvg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>چاپ بارکد</title></head>
    <body style="text-align:center;padding:20px;font-family:sans-serif">
      <h3>${currentProduct?.name || ''}</h3>
      ${svgData}
      <p>${currentProduct?.barcode || ''}</p>
      <script>onload=()=>{print();close()}<\/script>
    </body></html>
  `);
  win.document.close();
}

// === Close Modals ===
function closeModal() { document.getElementById('barcodeModal').classList.remove('active'); }
function closeQRModal() { document.getElementById('qrModal').classList.remove('active'); }

// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// === Helpers ===
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
