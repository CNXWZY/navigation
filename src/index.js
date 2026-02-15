/**
 * 备用随机 SVG 图标 - 优化设计
 */
const fallbackSVGIcons = [
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient1)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#7209b7" />
         <stop offset="100%" stop-color="#4cc9f0" />
       </linearGradient>
     </defs>
     <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
   </svg>`,
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient2)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#4361ee" />
         <stop offset="100%" stop-color="#4cc9f0" />
       </linearGradient>
     </defs>
     <circle cx="12" cy="12" r="10"/>
     <path d="M12 7v5l3.5 3.5 1.42-1.42L14 11.58V7h-2z" fill="#fff"/>
   </svg>`,
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient3)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#7209b7" />
         <stop offset="100%" stop-color="#4361ee" />
       </linearGradient>
     </defs>
     <path d="M12 .587l3.668 7.431L24 9.172l-6 5.843 1.416 8.252L12 19.771l-7.416 3.496L6 15.015 0 9.172l8.332-1.154z"/>
   </svg>`,
];

function getRandomSVG() {
  return fallbackSVGIcons[Math.floor(Math.random() * fallbackSVGIcons.length)];
}

/**
 * API 处理模块
 */
const api = {
  async purgeCache(request, env, ctx) {
    const cache = caches.default;
    try {
      const baseUrl = new URL(request.url).origin;
      const { results } = await env.NAV_DB.prepare('SELECT DISTINCT catelog FROM sites').all();
      const catalogs = results.map(r => r.catelog);
      const urlsToPurge = [`${baseUrl}/`];
      catalogs.forEach(cat => {
        urlsToPurge.push(`${baseUrl}/?catalog=${encodeURIComponent(cat)}`);
      });
      const promises = urlsToPurge.map(url => cache.delete(new Request(url, { method: 'GET' })));
      await Promise.all(promises);
    } catch (e) {
      console.error('Failed to purge cache:', e.message);
    }
  },

  async handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    const method = request.method;
    const id = url.pathname.split('/').pop();
    try {
      if (path === '/config') {
        switch (method) {
          case 'GET': return await this.getConfig(request, env, ctx, url);
          case 'POST': return await this.createConfig(request, env, ctx);
          default: return this.errorResponse('Method Not Allowed', 405);
        }
      }
      if (path === '/config/submit' && method === 'POST') {
        return await this.submitConfig(request, env, ctx);
      }
      if (path === `/config/${id}` && /^\d+$/.test(id)) {
        switch (method) {
          case 'PUT': return await this.updateConfig(request, env, ctx, id);
          case 'DELETE': return await this.deleteConfig(request, env, ctx, id);
          default: return this.errorResponse('Method Not Allowed', 405);
        }
      }
      if (path.startsWith('/pending/') && /^\d+$/.test(id)) {
        switch (method) {
          case 'PUT': return await this.approvePendingConfig(request, env, ctx, id);
          case 'DELETE': return await this.rejectPendingConfig(request, env, ctx, id);
          default: return this.errorResponse('Method Not Allowed', 405);
        }
      }
      if (path === '/config/import' && method === 'POST') {
        return await this.importConfig(request, env, ctx);
      }
      if (path === '/config/export' && method === 'GET') {
        return await this.exportConfig(request, env, ctx);
      }
      if (path === '/pending' && method === 'GET') {
        return await this.getPendingConfig(request, env, ctx, url);
      }
      return this.errorResponse('Not Found', 404);
    } catch (error) {
      return this.errorResponse(`Internal Server Error: ${error.message}`, 500);
    }
  },

  async getConfig(request, env, ctx, url) {
    const catalog = url.searchParams.get('catalog');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const keyword = url.searchParams.get('keyword');
    const offset = (page - 1) * pageSize;
    try {
      let query = `SELECT * FROM sites ORDER BY sort_order ASC, create_time DESC LIMIT ? OFFSET ?`;
      let countQuery = `SELECT COUNT(*) as total FROM sites`;
      let queryBindParams = [pageSize, offset];
      let countQueryParams = [];

      if (catalog) {
        query = `SELECT * FROM sites WHERE catelog = ? ORDER BY sort_order ASC, create_time DESC LIMIT ? OFFSET ?`;
        countQuery = `SELECT COUNT(*) as total FROM sites WHERE catelog = ?`;
        queryBindParams = [catalog, pageSize, offset];
        countQueryParams = [catalog];
      }

      if (keyword) {
        const likeKeyword = `%${keyword}%`;
        query = `SELECT * FROM sites WHERE name LIKE ? OR url LIKE ? OR catelog LIKE ? ORDER BY sort_order ASC, create_time DESC LIMIT ? OFFSET ?`;
        countQuery = `SELECT COUNT(*) as total FROM sites WHERE name LIKE ? OR url LIKE ? OR catelog LIKE ?`;
        queryBindParams = [likeKeyword, likeKeyword, likeKeyword, pageSize, offset];
        countQueryParams = [likeKeyword, likeKeyword, likeKeyword];
        if (catalog) {
          query = `SELECT * FROM sites WHERE catelog = ? AND (name LIKE ? OR url LIKE ? OR catelog LIKE ?) ORDER BY sort_order ASC, create_time DESC LIMIT ? OFFSET ?`;
          countQuery = `SELECT COUNT(*) as total FROM sites WHERE catelog = ? AND (name LIKE ? OR url LIKE ? OR catelog LIKE ?)`;
          queryBindParams = [catalog, likeKeyword, likeKeyword, likeKeyword, pageSize, offset];
          countQueryParams = [catalog, likeKeyword, likeKeyword, likeKeyword];
        }
      }

      const { results } = await env.NAV_DB.prepare(query).bind(...queryBindParams).all();
      const countResult = await env.NAV_DB.prepare(countQuery).bind(...countQueryParams).first();
      const total = countResult ? countResult.total : 0;

      return new Response(JSON.stringify({ code: 200, data: results, total, page, pageSize }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to fetch config data: ${e.message}`, 500);
    }
  },

  async getPendingConfig(request, env, ctx, url) {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const offset = (page - 1) * pageSize;
    try {
      const { results } = await env.NAV_DB.prepare(`SELECT * FROM pending_sites ORDER BY create_time DESC LIMIT ? OFFSET ?`).bind(pageSize, offset).all();
      const countResult = await env.NAV_DB.prepare(`SELECT COUNT(*) as total FROM pending_sites`).first();
      const total = countResult ? countResult.total : 0;
      return new Response(JSON.stringify({ code: 200, data: results, total, page, pageSize }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to fetch pending config data: ${e.message}`, 500);
    }
  },

  async approvePendingConfig(request, env, ctx, id) {
    try {
      const { results } = await env.NAV_DB.prepare('SELECT * FROM pending_sites WHERE id = ?').bind(id).all();
      if (results.length === 0) return this.errorResponse('Pending config not found', 404);
      const config = results[0];
      await env.NAV_DB.prepare(`INSERT INTO sites (name, url, logo, desc, catelog, sort_order) VALUES (?, ?, ?, ?, ?, 9999)`).bind(config.name, config.url, config.logo, config.desc, config.catelog).run();
      await env.NAV_DB.prepare('DELETE FROM pending_sites WHERE id = ?').bind(id).run();
      ctx.waitUntil(this.purgeCache(request, env, ctx));
      return new Response(JSON.stringify({ code: 200, message: 'Pending config approved successfully' }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to approve pending config: ${e.message}`, 500);
    }
  },

  async rejectPendingConfig(request, env, ctx, id) {
    try {
      await env.NAV_DB.prepare('DELETE FROM pending_sites WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ code: 200, message: 'Pending config rejected successfully' }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to reject pending config: ${e.message}`, 500);
    }
  },

  async submitConfig(request, env, ctx) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog } = config;
      if (!name || !url || !catelog) return this.errorResponse('Name, URL and Catelog are required', 400);
      await env.NAV_DB.prepare(`INSERT INTO pending_sites (name, url, logo, desc, catelog) VALUES (?, ?, ?, ?, ?)`).bind(name, url, logo, desc, catelog).run();
      return new Response(JSON.stringify({ code: 201, message: 'Config submitted successfully, waiting for admin approve' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to submit config: ${e.message}`, 500);
    }
  },

  async createConfig(request, env, ctx) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog, sort_order } = config;
      if (!name || !url || !catelog) return this.errorResponse('Name, URL and Catelog are required', 400);
      const insert = await env.NAV_DB.prepare(`INSERT INTO sites (name, url, logo, desc, catelog, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).bind(name, url, logo, desc, catelog, sort_order || 9999).run();
      ctx.waitUntil(this.purgeCache(request, env, ctx));
      return new Response(JSON.stringify({ code: 201, message: 'Config created successfully', insert }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to create config: ${e.message}`, 500);
    }
  },

  async updateConfig(request, env, ctx, id) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog, sort_order } = config;
      const update = await env.NAV_DB.prepare(`UPDATE sites SET name = ?, url = ?, logo = ?, desc = ?, catelog = ?, sort_order = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?`).bind(name, url, logo, desc, catelog, sort_order || 9999, id).run();
      ctx.waitUntil(this.purgeCache(request, env, ctx));
      return new Response(JSON.stringify({ code: 200, message: 'Config updated successfully', update }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to update config: ${e.message}`, 500);
    }
  },

  async deleteConfig(request, env, ctx, id) {
    try {
      const del = await env.NAV_DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
      ctx.waitUntil(this.purgeCache(request, env, ctx));
      return new Response(JSON.stringify({ code: 200, message: 'Config deleted successfully', del }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to delete config: ${e.message}`, 500);
    }
  },

  async importConfig(request, env, ctx) {
    try {
      const jsonData = await request.json();
      let sitesToImport = [];
      if (Array.isArray(jsonData)) sitesToImport = jsonData;
      else if (jsonData && typeof jsonData === 'object' && Array.isArray(jsonData.data)) sitesToImport = jsonData.data;
      else return this.errorResponse('Invalid JSON data', 400);
      if (sitesToImport.length === 0) return new Response(JSON.stringify({ code: 200, message: 'Import successful, but no data' }), { headers: { 'Content-Type': 'application/json' } });
      const insertStatements = sitesToImport.map(item => env.NAV_DB.prepare(`INSERT INTO sites (name, url, logo, desc, catelog, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).bind(item.name || null, item.url || null, item.logo || null, item.desc || null, item.catelog || null, item.sort_order || 9999));
      await env.NAV_DB.batch(insertStatements);
      ctx.waitUntil(this.purgeCache(request, env, ctx));
      return new Response(JSON.stringify({ code: 201, message: `Config imported successfully. ${sitesToImport.length} items added.` }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return this.errorResponse(`Failed to import config: ${error.message}`, 500);
    }
  },

  async exportConfig(request, env, ctx) {
    try {
      const { results } = await env.NAV_DB.prepare('SELECT * FROM sites ORDER BY sort_order ASC, create_time DESC').all();
      const pureJsonData = JSON.stringify(results, null, 2);
      return new Response(pureJsonData, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="config.json"' } });
    } catch (e) {
      return this.errorResponse(`Failed to export config: ${e.message}`, 500);
    }
  },

  errorResponse(message, status) {
    return new Response(JSON.stringify({ code: status, message }), { status, headers: { 'Content-Type': 'application/json' } });
  }
};

/**
 * 后台管理模块
 */
const admin = {
  async handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/admin') {
      const params = url.searchParams;
      const name = params.get('name');
      const password = params.get('password');
      const storedUsername = await env.NAV_AUTH.get("admin_username");
      const storedPassword = await env.NAV_AUTH.get("admin_password");
      if (name === storedUsername && password === storedPassword) return this.renderAdminPage();
      else if (name || password) return new Response('未授权访问', { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      else return this.renderLoginPage();
    }
    if (url.pathname.startsWith('/static')) return this.handleStatic(request, env, ctx);
    return new Response('页面不存在', { status: 404 });
  },

  async handleStatic(request, env, ctx) {
    const url = new URL(request.url);
    const filePath = url.pathname.replace('/static/', '');
    let contentType = 'text/plain';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.js')) contentType = 'application/javascript';
    try {
      const fileContent = await this.getFileContent(filePath);
      return new Response(fileContent, { headers: { 'Content-Type': contentType } });
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  },

  async getFileContent(filePath) {
    const fileContents = {
      'admin.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>书签管理页面</title>
  <link rel="stylesheet" href="/static/admin.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
      <h1>书签管理</h1>
      <div class="import-export">
        <input type="file" id="importFile" accept=".json" style="display:none;">
        <button id="importBtn">导入</button>
        <button id="exportBtn">导出</button>
      </div>
      <div class="add-new">
        <input type="text" id="addName" placeholder="Name" required>
        <input type="text" id="addUrl" placeholder="URL" required>
        <input type="text" id="addLogo" placeholder="Logo(optional)">
        <input type="text" id="addDesc" placeholder="Description(optional)">
        <input type="text" id="addCatelog" placeholder="Catelog" required>
        <input type="number" id="addSortOrder" placeholder="排序 (数字小靠前)">
        <button id="addBtn">添加</button>
      </div>
      <div id="message" style="display:none;padding:1rem;border-radius:0.5rem;margin-bottom:1rem;"></div>
     <div class="tab-wrapper">
          <div class="tab-buttons">
             <button class="tab-button active" data-tab="config">书签列表</button>
             <button class="tab-button" data-tab="pending">待审核列表</button>
          </div>
           <div id="config" class="tab-content active">
                <div class="table-wrapper">
                    <table id="configTable">
                        <thead>
                            <tr>
                              <th>ID</th><th>Name</th><th>URL</th><th>Logo</th><th>Description</th><th>Catelog</th><th>排序</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="configTableBody"></tbody>
                    </table>
                    <div class="pagination">
                          <button id="prevPage" disabled>上一页</button>
                          <span id="currentPage">1</span>/<span id="totalPages">1</span>
                          <button id="nextPage" disabled>下一页</button>
                    </div>
               </div>
            </div>
           <div id="pending" class="tab-content">
             <div class="table-wrapper">
               <table id="pendingTable">
                  <thead><tr><th>ID</th><th>Name</th><th>URL</th><th>Logo</th><th>Description</th><th>Catelog</th><th>Actions</th></tr></thead>
                  <tbody id="pendingTableBody"></tbody>
              </table>
               <div class="pagination">
                <button id="pendingPrevPage" disabled>上一页</button>
                 <span id="pendingCurrentPage">1</span>/<span id="pendingTotalPages">1</span>
                <button id="pendingNextPage" disabled>下一页</button>
            </div>
             </div>
           </div>
        </div>
  </div>
  <script src="/static/admin.js"></script>
</body>
</html>`,
      'admin.css': `body{font-family:'Noto Sans SC',sans-serif;margin:0;padding:10px;background:#f8f9fa;color:#212529}.modal{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;overflow:auto;background:rgba(0,0,0,.5)}.modal-content{background:#fff;margin:10% auto;padding:20px;border:1px solid #dee2e6;width:80%;max-width:600px;border-radius:8px;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.1)}.modal-close{color:#6c757d;position:absolute;right:10px;top:0;font-size:28px;font-weight:bold;cursor:pointer}.modal-close:hover,.modal-close:focus{color:#343a40;text-decoration:none;cursor:pointer}.modal-content form{display:flex;flex-direction:column}.modal-content form label{margin-bottom:5px;font-weight:500;color:#495057}.modal-content form input{margin-bottom:10px;padding:10px;border:1px solid #ced4da;border-radius:4px;font-size:1rem;outline:none;transition:border-color .2s}.modal-content form input:focus{border-color:#80bdff;box-shadow:0 0 0 .2rem rgba(0,123,255,.25)}.modal-content button[type=submit]{margin-top:10px;background:#007bff;color:#fff;border:none;padding:10px 15px;border-radius:4px;cursor:pointer;font-size:1rem;transition:background-color .3s}.modal-content button[type=submit]:hover{background:#0056b3}.container{max-width:1200px;margin:0 auto;background:#fff;padding:20px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,.1)}h1{text-align:center;margin-bottom:20px;color:#343a40}.tab-wrapper{margin-top:20px}.tab-buttons{display:flex;margin-bottom:10px;flex-wrap:wrap}.tab-button{background:#e9ecef;border:1px solid #dee2e6;padding:10px 15px;border-radius:4px 4px 0 0;cursor:pointer;color:#495057;transition:background .2s,color .2s}.tab-button.active{background:#fff;border-bottom:1px solid #fff;color:#212529}.tab-button:hover{background:#f0f0f0}.tab-content{display:none;border:1px solid #dee2e6;padding:10px;border-top:none}.tab-content.active{display:block}.import-export{display:flex;gap:10px;margin-bottom:20px;justify-content:flex-end;flex-wrap:wrap}.add-new{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}.add-new>input{flex:1 1 150px;min-width:150px}.add-new>button{flex-basis:100%}@media(min-width:768px){.add-new>button{flex-basis:auto}}input[type=text],input[type=number]{padding:10px;border:1px solid #ced4da;border-radius:4px;font-size:1rem;outline:none;margin-bottom:5px;transition:border-color .2s}input[type=text]:focus,input[type=number]:focus{border-color:#80bdff;box-shadow:0 0 0 .2rem rgba(0,123,255,.25)}button{background:#6c63ff;color:#fff;border:none;padding:10px 15px;border-radius:4px;cursor:pointer;font-size:1rem;transition:background-color .3s}button:hover{background:#534dc4}.table-wrapper{overflow-x:auto}table{width:100%;min-width:800px;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #dee2e6;padding:10px;text-align:left;color:#495057}th{background:#f2f2f2;font-weight:600}tr:nth-child(even){background:#f9f9f9}.actions{display:flex;gap:5px}.actions button{padding:5px 8px;font-size:.8rem}.edit-btn{background:#17a2b8}.del-btn{background:#dc3545}.pagination{text-align:center;margin-top:20px}.pagination button{margin:0 5px;background:#e9ecef;color:#495057;border:1px solid #ced4da}.pagination button:hover{background:#dee2e6}.success{background:#28a745;color:#fff}.error{background:#dc3545;color:#fff}`,
      'admin.js': `const configTableBody=document.getElementById('configTableBody'),prevPageBtn=document.getElementById('prevPage'),nextPageBtn=document.getElementById('nextPage'),currentPageSpan=document.getElementById('currentPage'),totalPagesSpan=document.getElementById('totalPages'),pendingTableBody=document.getElementById('pendingTableBody'),pendingPrevPageBtn=document.getElementById('pendingPrevPage'),pendingNextPageBtn=document.getElementById('pendingNextPage'),pendingCurrentPageSpan=document.getElementById('pendingCurrentPage'),pendingTotalPagesSpan=document.getElementById('pendingTotalPages'),messageDiv=document.getElementById('message'),addBtn=document.getElementById('addBtn'),addName=document.getElementById('addName'),addUrl=document.getElementById('addUrl'),addLogo=document.getElementById('addLogo'),addDesc=document.getElementById('addDesc'),addCatelog=document.getElementById('addCatelog'),addSortOrder=document.getElementById('addSortOrder'),importBtn=document.getElementById('importBtn'),importFile=document.getElementById('importFile'),exportBtn=document.getElementById('exportBtn'),tabButtons=document.querySelectorAll('.tab-button'),tabContents=document.querySelectorAll('.tab-content');tabButtons.forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.tab;tabButtons.forEach(x=>x.classList.remove('active'));b.classList.add('active');tabContents.forEach(x=>{x.classList.remove('active');if(x.id===t)x.classList.add('active')})}));const searchInput=document.createElement('input');searchInput.type='text';searchInput.placeholder='搜索书签';searchInput.id='searchInput';searchInput.style.marginBottom='10px';document.querySelector('.add-new').parentNode.insertBefore(searchInput,document.querySelector('.add-new'));let currentPage=1,pageSize=10,totalItems=0,allConfigs=[],currentSearchKeyword='',pendingCurrentPage=1,pendingPageSize=10,pendingTotalItems=0,allPendingConfigs=[];const editModal=document.createElement('div');editModal.className='modal';editModal.style.display='none';editModal.innerHTML=\`<div class="modal-content"><span class="modal-close">×</span><h2>编辑站点</h2><form id="editForm"><input type="hidden" id="editId"><label for="editName">名称:</label><input type="text" id="editName" required><br><label for="editUrl">URL:</label><input type="text" id="editUrl" required><br><label for="editLogo">Logo:</label><input type="text" id="editLogo"><br><label for="editDesc">描述:</label><input type="text" id="editDesc"><br><label for="editCatelog">分类:</label><input type="text" id="editCatelog" required><br><label for="editSortOrder">排序:</label><input type="number" id="editSortOrder"><br><button type="submit">保存</button></form></div>\`;document.body.appendChild(editModal);const modalClose=editModal.querySelector('.modal-close');modalClose.addEventListener('click',()=>{editModal.style.display='none'});document.getElementById('editForm').addEventListener('submit',function(e){e.preventDefault();const id=document.getElementById('editId').value,name=document.getElementById('editName').value,url=document.getElementById('editUrl').value,logo=document.getElementById('editLogo').value,desc=document.getElementById('editDesc').value,catelog=document.getElementById('editCatelog').value,sort_order=document.getElementById('editSortOrder').value;fetch(\`/api/config/\${id}\`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,url,logo,desc,catelog,sort_order})}).then(r=>r.json()).then(d=>{if(d.code===200){showMessage('修改成功','success');fetchConfigs();editModal.style.display='none'}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))});function fetchConfigs(page=currentPage,keyword=currentSearchKeyword){let u=\`/api/config?page=\${page}&pageSize=\${pageSize}\`;if(keyword)u=\`/api/config?page=\${page}&pageSize=\${pageSize}&keyword=\${keyword}\`;fetch(u).then(r=>r.json()).then(d=>{if(d.code===200){totalItems=d.total;currentPage=d.page;totalPagesSpan.innerText=Math.ceil(totalItems/pageSize);currentPageSpan.innerText=currentPage;allConfigs=d.data;renderConfig(allConfigs);updatePaginationButtons()}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))}function renderConfig(c){configTableBody.innerHTML='';if(c.length===0){configTableBody.innerHTML='<tr><td colspan="7">没有配置数据</td></tr>';return}c.forEach(cf=>{const r=document.createElement('tr');r.innerHTML=\`<td>\${cf.id}</td><td>\${cf.name}</td><td><a href="\${cf.url}" target="_blank">\${cf.url}</a></td><td>\${cf.logo?\`<img src="\${cf.logo}" style="width:30px;">\`:'N/A'}</td><td>\${cf.desc||'N/A'}</td><td>\${cf.catelog}</td><td>\${cf.sort_order===9999?'默认':cf.sort_order}</td><td class="actions"><button class="edit-btn" data-id="\${cf.id}">编辑</button><button class="del-btn" data-id="\${cf.id}">删除</button></td>\`;configTableBody.appendChild(r)});bindActionEvents()}function bindActionEvents(){document.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click',function(){handleEdit(this.dataset.id)}));document.querySelectorAll('.del-btn').forEach(b=>b.addEventListener('click',function(){handleDelete(this.dataset.id)}))}function handleEdit(id){fetch(\`/api/config?page=1&pageSize=1000\`).then(r=>r.json()).then(d=>{const c=d.data.find(x=>x.id==id);if(!c){showMessage('找不到数据','error');return}document.getElementById('editId').value=c.id;document.getElementById('editName').value=c.name;document.getElementById('editUrl').value=c.url;document.getElementById('editLogo').value=c.logo||'';document.getElementById('editDesc').value=c.desc||'';document.getElementById('editCatelog').value=c.catelog;document.getElementById('editSortOrder').value=c.sort_order===9999?'':c.sort_order;editModal.style.display='block'})}function handleDelete(id){if(!confirm('确认删除？'))return;fetch(\`/api/config/\${id}\`,{method:'DELETE'}).then(r=>r.json()).then(d=>{if(d.code===200){showMessage('删除成功','success');fetchConfigs()}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))}function showMessage(m,t){messageDiv.innerText=m;messageDiv.className=t;messageDiv.style.display='block';setTimeout(()=>{messageDiv.style.display='none'},3000)}function updatePaginationButtons(){prevPageBtn.disabled=currentPage===1;nextPageBtn.disabled=currentPage>=Math.ceil(totalItems/pageSize)}prevPageBtn.addEventListener('click',()=>{if(currentPage>1)fetchConfigs(currentPage-1)});nextPageBtn.addEventListener('click',()=>{if(currentPage<Math.ceil(totalItems/pageSize))fetchConfigs(currentPage+1)});addBtn.addEventListener('click',()=>{const n=addName.value,u=addUrl.value,l=addLogo.value,d=addDesc.value,c=addCatelog.value,s=addSortOrder.value;if(!n||!u||!c){showMessage('名称,URL,分类 必填','error');return}fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,url:u,logo:l,desc:d,catelog:c,sort_order:s})}).then(r=>r.json()).then(d=>{if(d.code===201){showMessage('添加成功','success');addName.value='';addUrl.value='';addLogo.value='';addDesc.value='';addCatelog.value='';addSortOrder.value='';fetchConfigs()}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))});importBtn.addEventListener('click',()=>{importFile.click()});importFile.addEventListener('change',function(e){const f=e.target.files[0];if(f){const r=new FileReader();r.onload=function(e){try{const d=JSON.parse(e.target.result);fetch('/api/config/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json()).then(d=>{if(d.code===201){showMessage('导入成功','success');fetchConfigs()}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))}catch{}{showMessage('JSON格式不正确','error')}};r.readAsText(f)}})exportBtn.addEventListener('click',()=>{fetch('/api/config/export').then(r=>r.blob()).then(b=>{const u=window.URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='config.json';document.body.appendChild(a);a.click();window.URL.revokeObjectURL(u);document.body.removeChild(a)})});searchInput.addEventListener('input',()=>{currentSearchKeyword=searchInput.value.trim();currentPage=1;fetchConfigs(currentPage,currentSearchKeyword)});function fetchPendingConfigs(page=pendingCurrentPage){fetch(\`/api/pending?page=\${page}&pageSize=\${pendingPageSize}\`).then(r=>r.json()).then(d=>{if(d.code===200){pendingTotalItems=d.total;pendingCurrentPage=d.page;pendingTotalPagesSpan.innerText=Math.ceil(pendingTotalItems/pendingPageSize);pendingCurrentPageSpan.innerText=pendingCurrentPage;allPendingConfigs=d.data;renderPendingConfig(allPendingConfigs);updatePendingPaginationButtons()}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))}function renderPendingConfig(c){pendingTableBody.innerHTML='';if(c.length===0){pendingTableBody.innerHTML='<tr><td colspan="7">没有待审核数据</td></tr>';return}c.forEach(cf=>{const r=document.createElement('tr');r.innerHTML=\`<td>\${cf.id}</td><td>\${cf.name}</td><td><a href="\${cf.url}" target="_blank">\${cf.url}</a></td><td>\${cf.logo?\`<img src="\${cf.logo}" style="width:30px;">\`:'N/A'}</td><td>\${cf.desc||'N/A'}</td><td>\${cf.catelog}</td><td class="actions"><button class="approve-btn" data-id="\${cf.id}">批准</button><button class="reject-btn" data-id="\${cf.id}">拒绝</button></td>\`;pendingTableBody.appendChild(r)});bindPendingActionEvents()}function bindPendingActionEvents(){document.querySelectorAll('.approve-btn').forEach(b=>b.addEventListener('click',function(){handleApprove(this.dataset.id)}));document.querySelectorAll('.reject-btn').forEach(b=>b.addEventListener('click',function(){handleReject(this.dataset.id)}))}function handleApprove(id){if(!confirm('确定批准吗？'))return;fetch(\`/api/pending/\${id}\`,{method:'PUT'}).then(r=>r.json()).then(d=>{if(d.code===200){showMessage('批准成功','success');fetchPendingConfigs();fetchConfigs()}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))}function handleReject(id){if(!confirm('确定拒绝吗？'))return;fetch(\`/api/pending/\${id}\`,{method:'DELETE'}).then(r=>r.json()).then(d=>{if(d.code===200){showMessage('拒绝成功','success');fetchPendingConfigs()}else{showMessage(d.message,'error')}}).catch(()=>showMessage('网络错误','error'))}function updatePendingPaginationButtons(){pendingPrevPageBtn.disabled=pendingCurrentPage===1;pendingNextPageBtn.disabled=pendingCurrentPage>=Math.ceil(pendingTotalItems/pendingPageSize)}pendingPrevPageBtn.addEventListener('click',()=>{if(pendingCurrentPage>1)fetchPendingConfigs(pendingCurrentPage-1)});pendingNextPageBtn.addEventListener('click',()=>{if(pendingCurrentPage<Math.ceil(pendingTotalItems/pendingPageSize))fetchPendingConfigs(pendingCurrentPage+1)});fetchConfigs();fetchPendingConfigs();`
    };
    return fileContents[filePath];
  },

  async renderAdminPage() {
    const html = await this.getFileContent('admin.html');
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },

  async renderLoginPage() {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理员登录</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{height:100%;margin:0;padding:0;font-family:'Noto Sans SC',sans-serif;-webkit-font-smoothing:antialiased}
    body{display:flex;justify-content:center;align-items:center;background:#f8f9fa;padding:1rem}
    .login-container{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.08);width:100%;max-width:380px;animation:fadeIn .5s ease-out}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .login-title{font-size:1.75rem;font-weight:700;text-align:center;margin:0 0 1.5rem;color:#333}
    .form-group{margin-bottom:1.25rem}
    label{display:block;margin-bottom:.5rem;font-weight:500;color:#555}
    input{width:100%;padding:.875rem 1rem;border:1px solid #ddd;border-radius:6px;font-size:1rem;transition:border-color .2s,box-shadow .2s}
    input:focus{border-color:#7209b7;outline:none;box-shadow:0 0 0 3px rgba(114,9,183,.15)}
    button{width:100%;padding:.875rem;background:#7209b7;color:#fff;border:none;border-radius:6px;font-size:1rem;font-weight:500;cursor:pointer;transition:background .2s,transform .1s}
    button:hover{background:#5a067c}
    button:active{transform:scale(.98)}
    .error-message{color:#dc3545;font-size:.875rem;margin-top:.5rem;text-align:center;display:none}
    .back-link{display:block;text-align:center;margin-top:1.5rem;color:#7209b7;text-decoration:none;font-size:.875rem}
    .back-link:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="login-container">
    <h1 class="login-title">管理员登录</h1>
    <form id="loginForm">
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" name="username" required>
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" required>
      </div>
      <div class="error-message" id="errorMessage">用户名或密码错误</div>
      <button type="submit">登 录</button>
    </form>
    <a href="/" class="back-link">返回首页</a>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit',function(e){
      e.preventDefault();
      const u=document.getElementById('username').value,p=document.getElementById('password').value;
      window.location.href='/admin?name='+encodeURIComponent(u)+'&password='+encodeURIComponent(p);
    });
  </script>
</body>
</html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};

/**
 * 主页面渲染 - 优化版前端
 */
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const cache = caches.default;

  if (request.method === 'GET') {
    const cacheKey = new Request(url.toString(), request);
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
  }

  const catalog = url.searchParams.get('catalog');
  let sites = [];
  try {
    const { results } = await env.NAV_DB.prepare('SELECT * FROM sites ORDER BY sort_order ASC, create_time DESC').all();
    sites = results;
  } catch (e) {
    return new Response(`Failed to fetch data: ${e.message}`, { status: 500 });
  }

  if (!sites || sites.length === 0) {
    return new Response('No site configuration found.', { status: 404 });
  }

  const catalogs = Array.from(new Set(sites.map(s => s.catelog)));
  const currentCatalog = catalog || (catalogs.length > 0 ? catalogs[0] : '');
  const currentSites = sites.filter(s => s.catelog === currentCatalog);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>行稳致远</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet"/>
  <link rel="icon" href="https://blog.xwzy.xx.kg/images/head/a.webp" type="image/webp"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {50:'#f4f1fd',100:'#e9e3fb',200:'#d3c7f7',300:'#b0a0f0',400:'#8a70e7',500:'#7209b7',600:'#6532cc',700:'#5429ab',800:'#46238d',900:'#3b1f75',950:'#241245'},
            secondary: {50:'#eef4ff',100:'#e0ebff',200:'#c7d9ff',300:'#a3beff',400:'#7a9aff',500:'#5a77fb',600:'#4361ee',700:'#2c4be0',800:'#283db6',900:'#253690',950:'#1a265c'},
            accent: {50:'#ecfdff',100:'#d0f7fe',200:'#a9eefe',300:'#72e0fd',400:'#33cafc',500:'#4cc9f0',600:'#0689cb',700:'#0b6ca6',800:'#115887',900:'#134971',950:'#0c2d48'},
          },
          fontFamily: { sans: ['Noto Sans SC', 'sans-serif'] },
        }
      }
    }
  </script>
  <style>
    :root {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --card-bg: rgba(255,255,255,0.8);
      --sidebar-bg: rgba(255,255,255,0.95);
    }
    .dark {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --card-bg: rgba(30,41,59,0.8);
      --sidebar-bg: rgba(15,23,42,0.95);
    }
    body { background: var(--bg-primary); color: var(--text-primary); transition: all 0.3s ease; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .dark ::-webkit-scrollbar-thumb { background: #475569; }
    .site-card {
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      background: var(--card-bg);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .dark .site-card { border: 1px solid rgba(255,255,255,0.05); }
    .site-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
    .dark .site-card:hover { box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    @keyframes fadeInOut { 0%{opacity:0;transform:translateY(10px)} 20%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0;transform:translateY(-10px)} }
    .copy-success-animation { animation: fadeInOut 2s ease forwards; }
    @media (max-width: 768px) {
      .mobile-sidebar { transform: translateX(-100%); transition: transform 0.3s ease; }
      .mobile-sidebar.open { transform: translateX(0); }
      .mobile-overlay { opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
      .mobile-overlay.open { opacity: 1; pointer-events: auto; }
    }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    #sidebar-toggle { display: none; }
    @media (min-width: 769px) {
      #sidebar-toggle:checked ~ .sidebar { margin-left: -16rem; }
      #sidebar-toggle:checked ~ .main-content { margin-left: 0; }
    }
    .sidebar { background: var(--sidebar-bg); }
    .dark .bg-gray-50 { background: var(--bg-primary); }
    .dark .text-gray-800 { color: var(--text-primary); }
    .dark .text-gray-500 { color: var(--text-secondary); }
    .dark .bg-white { background: var(--bg-secondary); }
    .glass-header {
      background: linear-gradient(135deg, #7209b7 0%, #4361ee 50%, #4cc9f0 100%);
      position: relative;
      overflow: hidden;
    }
    .glass-header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    @media (max-width: 768px) {
      .mobile-nav-btn { display: block; }
    }
  </style>
</head>
<body class="bg-gray-50 font-sans text-gray-800">
  <input type="checkbox" id="sidebar-toggle" class="hidden">
  
  <!-- 移动端导航按钮 -->
  <div class="fixed top-4 left-4 z-50 lg:hidden">
    <button id="sidebarToggle" class="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-md hover:bg-gray-100 dark:hover:bg-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </div>
  
  <!-- 主题切换按钮 -->
  <button id="themeToggle" class="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-md hover:bg-gray-100 dark:hover:bg-slate-700">
    <svg id="sunIcon" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-500 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
    <svg id="moonIcon" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  </button>
  
  <div id="mobileOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 mobile-overlay lg:hidden"></div>
  
  <!-- 桌面侧边栏开关 -->
  <div class="fixed top-4 left-4 z-50 hidden lg:block">
    <label for="sidebar-toggle" class="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 inline-block cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </label>
  </div>
  
  <!-- 侧边栏 -->
  <aside id="sidebar" class="sidebar fixed left-0 top-0 h-full w-64 shadow-lg z-50 overflow-y-auto mobile-sidebar lg:transform-none transition-all duration-300">
    <div class="p-6">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-primary-500">行稳致远</h2>
        <button id="closeSidebar" class="p-1 rounded-full hover:bg-gray-100 lg:hidden dark:hover:bg-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <label for="sidebar-toggle" class="p-1 rounded-full hover:bg-gray-100 hidden lg:block cursor-pointer dark:hover:bg-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </label>
      </div>
      
      <div class="mb-6">
        <div class="relative">
          <input id="searchInput" type="text" placeholder="搜索书签..." class="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-800 dark:border-slate-600 dark:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div>
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 dark:text-slate-400">分类导航</h3>
        <div class="space-y-1">
          ${catalogs.map(cat => `
            <a href="?catalog=${encodeURIComponent(cat)}" class="flex items-center px-3 py-2 rounded-lg ${cat === currentCatalog ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-slate-800'} w-full">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 ${cat === currentCatalog ? 'text-primary-500' : 'text-gray-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              ${cat}
            </a>
          `).join('')}
        </div>
      </div>
      
      <!-- 添加书签按钮 -->
      <div class="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
        <button id="addSiteBtnSidebar" class="w-full flex items-center px-4 py-2 text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加书签
        </button>
      </div>
      
      <div class="mt-4">
        <a href="https://blog.xwzy.xx.kg/" target="_blank" class="flex items-center px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          访问博客
        </a>
        <a href="/admin" target="_blank" class="flex items-center px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition duration-300 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          后台管理
        </a>
      </div>
    </div>
  </aside>
  
  <!-- 主内容区 -->
  <main class="main-content lg:ml-64 min-h-screen transition-all duration-300">
    <header class="glass-header text-white py-12 px-6 md:px-10">
      <div class="max-w-5xl mx-auto">
        <div class="flex flex-col md:flex-row items-center justify-center">
          <div class="text-center relative z-10">
            <h1 class="text-3xl md:text-4xl font-bold mb-2">行稳致远</h1>
            <p class="text-primary-100 max-w-xl">的导航站</p>
          </div>
        </div>
      </div>
    </header>
    
    <section class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white">
          ${currentCatalog ? `${currentCatalog} · ${currentSites.length} 个网站` : `所有书签 · ${sites.length} 个网站`}
        </h2>
        <div class="text-sm text-gray-500 hidden md:block dark:text-slate-400">
          <div id="hitokoto"><a href="#" target="_blank" id="hitokoto_text">疏影横斜水清浅，暗香浮动月黄昏。</a></div>
        </div>
      </div>
      
      <div id="sitesGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        ${currentSites.map(site => `
          <div class="site-card group bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg overflow-hidden" data-id="${site.id}" data-name="${site.name}" data-url="${site.url}" data-catalog="${site.catelog}">
            <div class="p-5">
              <a href="${site.url}" target="_blank" class="block">
                <div class="flex items-start">
                  <div class="flex-shrink-0 mr-4">
                    ${site.logo 
                      ? `<img src="${site.logo}" alt="${site.name}" class="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-slate-700">`
                      : `<div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center text-white font-bold text-lg">${site.name.charAt(0).toUpperCase()}</div>`
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-base font-medium text-gray-900 dark:text-white truncate">${site.name}</h3>
                    <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300">
                      ${site.catelog}
                    </span>
                  </div>
                </div>
                <p class="mt-2 text-sm text-gray-500 dark:text-slate-400 line-clamp-2" title="${site.desc || '暂无描述'}">${site.desc || '暂无描述'}</p>
              </a>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[140px]">${site.url}</span>
                <button class="copy-btn flex items-center px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full text-xs font-medium transition-colors" data-url="${site.url}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  复制
                  <span class="copy-success hidden absolute -top-8 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-md">已复制!</span>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
    
    <footer class="bg-white dark:bg-slate-800 py-8 px-6 mt-12 border-t border-gray-200 dark:border-slate-700">
      <div class="max-w-5xl mx-auto text-center">
        <p class="text-gray-500 dark:text-slate-400">© ${new Date().getFullYear()} 行稳致远 | 愿你在此找到方向</p>
      </div>
    </footer>
  </main>
  
  <button id="backToTop" class="fixed bottom-8 right-8 p-3 rounded-full bg-primary-500 text-white shadow-lg opacity-0 invisible transition-all duration-300 hover:bg-primary-600">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
    </svg>
  </button>
  
  <!-- 添加网站模态框 -->
  <div id="addSiteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 invisible transition-all duration-300">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 transform translate-y-8 transition-all duration-300">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">添加新书签</h2>
          <button id="closeModal" class="text-gray-400 hover:text-gray-500 dark:hover:text-slate-300">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form id="addSiteForm" class="space-y-4">
          <div>
            <label for="addSiteName" class="block text-sm font-medium text-gray-700 dark:text-slate-300">名称</label>
            <input type="text" id="addSiteName" required class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
          </div>
          <div>
            <label for="addSiteUrl" class="block text-sm font-medium text-gray-700 dark:text-slate-300">网址</label>
            <input type="text" id="addSiteUrl" required class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
          </div>
          <div>
            <label for="addSiteLogo" class="block text-sm font-medium text-gray-700 dark:text-slate-300">Logo (可选)</label>
            <input type="text" id="addSiteLogo" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
          </div>
          <div>
            <label for="addSiteDesc" class="block text-sm font-medium text-gray-700 dark:text-slate-300">描述 (可选)</label>
            <textarea id="addSiteDesc" rows="2" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"></textarea>
          </div>
          <div>
            <label for="addSiteCatelog" class="block text-sm font-medium text-gray-700 dark:text-slate-300">分类</label>
            <input type="text" id="addSiteCatelog" required class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" list="catalogList">
            <datalist id="catalogList">
              ${catalogs.map(cat => `<option value="${cat}">`).join('')}
            </datalist>
          </div>
          <div class="flex justify-end pt-4">
            <button type="button" id="cancelAddSite" class="bg-white dark:bg-slate-700 py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-3">取消</button>
            <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">提交</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  
  <script>
    // 一言API
    fetch('https://v1.hitokoto.cn').then(r=>r.json()).then(d=>{const h=document.getElementById('hitokoto_text');h.href='https://hitokoto.cn/?uuid='+d.uuid;h.innerText=d.hitokoto}).catch(()=>{});
    
    // 主题切换
    const themeToggle=document.getElementById('themeToggle'),sunIcon=document.getElementById('sunIcon'),moonIcon=document.getElementById('moonIcon');
    function updateTheme(){const d=localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);sunIcon.classList.toggle('hidden',!d);moonIcon.classList.toggle('hidden',d)}
    themeToggle.addEventListener('click',()=>{const isDark=document.documentElement.classList.toggle('dark');localStorage.setItem('theme',isDark?'dark':'light');updateTheme()});
    updateTheme();
    
    // 侧边栏
    const sidebar=document.getElementById('sidebar'),mobileOverlay=document.getElementById('mobileOverlay'),sidebarToggle=document.getElementById('sidebarToggle'),closeSidebar=document.getElementById('closeSidebar');
    function openSidebar(){sidebar.classList.add('open');mobileOverlay.classList.add('open');document.body.style.overflow='hidden'}
    function closeSidebarMenu(){sidebar.classList.remove('open');mobileOverlay.classList.remove('open');document.body.style.overflow=''}
    sidebarToggle?.addEventListener('click',openSidebar);closeSidebar?.addEventListener('click',closeSidebarMenu);mobileOverlay?.addEventListener('click',closeSidebarMenu);
    
    // 复制
    document.querySelectorAll('.copy-btn').forEach(btn=>{btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();const u=this.getAttribute('data-url');navigator.clipboard.writeText(u).then(()=>{const s=this.querySelector('.copy-success');s.classList.remove('hidden');s.classList.add('copy-success-animation');setTimeout(()=>{s.classList.add('hidden');s.classList.remove('copy-success-animation')},2000)}).catch(()=>{const t=document.createElement('textarea');t.value=u;t.style.position='fixed';document.body.appendChild(t);t.focus();t.select();document.execCommand('copy');document.body.removeChild(t);const s=this.querySelector('.copy-success');s.classList.remove('hidden');s.classList.add('copy-success-animation');setTimeout(()=>{s.classList.add('hidden');s.classList.remove('copy-success-animation')},2000)})})});
    
    // 返回顶部
    const backToTop=document.getElementById('backToTop');
    window.addEventListener('scroll',()=>{backToTop.classList.toggle('opacity-0',window.pageYOffset<=300);backToTop.classList.toggle('invisible',window.pageYOffset<=300)});
    backToTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
    
    // 添加书签模态框
    const addSiteModal=document.getElementById('addSiteModal'),addSiteBtnSidebar=document.getElementById('addSiteBtnSidebar'),closeModalBtn=document.getElementById('closeModal'),cancelAddSite=document.getElementById('cancelAddSite'),addSiteForm=document.getElementById('addSiteForm');
    function openModal(){addSiteModal.classList.remove('opacity-0','invisible');addSiteModal.querySelector('.max-w-md')?.classList.remove('translate-y-8');document.body.style.overflow='hidden'}
    function closeModal(){addSiteModal.classList.add('opacity-0','invisible');addSiteModal.querySelector('.max-w-md')?.classList.add('translate-y-8');document.body.style.overflow=''}
    addSiteBtnSidebar?.addEventListener('click',e=>{e.preventDefault();openModal()});
    closeModalBtn?.addEventListener('click',closeModal);cancelAddSite?.addEventListener('click',closeModal);
    addSiteModal?.addEventListener('click',e=>{if(e.target===addSiteModal)closeModal()});
    
    // 表单提交
    addSiteForm?.addEventListener('submit',function(e){e.preventDefault();
      const name=document.getElementById('addSiteName').value,url=document.getElementById('addSiteUrl').value,logo=document.getElementById('addSiteLogo').value,desc=document.getElementById('addSiteDesc').value,catelog=document.getElementById('addSiteCatelog').value;
      fetch('/api/config/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,url,logo,desc,catelog})}).then(r=>r.json()).then(d=>{if(d.code===201){const s=document.createElement('div');s.className='fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in';s.textContent='提交成功，等待管理员审核';document.body.appendChild(s);setTimeout(()=>{s.classList.add('opacity-0');setTimeout(()=>s.remove(),300)},2500);closeModal();addSiteForm.reset()}else{alert(d.message||'提交失败')}}).catch(err=>alert('网络错误'))});
    
    // 搜索
    const searchInput=document.getElementById('searchInput'),sitesGrid=document.getElementById('sitesGrid'),siteCards=document.querySelectorAll('.site-card');
    searchInput?.addEventListener('input',function(){const k=this.value.toLowerCase().trim();siteCards.forEach(c=>{const n=c.getAttribute('data-name').toLowerCase(),u=c.getAttribute('data-url').toLowerCase(),cat=c.getAttribute('data-catalog').toLowerCase();c.classList.toggle('hidden',!n.includes(k)&&!u.includes(k)&&!cat.includes(k))});const v=sitesGrid.querySelectorAll('.site-card:not(.hidden)'),h=document.querySelector('h2');if(h)h.textContent=k?'搜索结果 · '+v.length+' 个网站':(window.location.search.includes('catalog=')?'${currentCatalog} · '+v.length+' 个网站':'全部收藏 · '+v.length+' 个网站')});
  </script>
</body>
</html>`;

  const response = new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=31536000'
    }
  });

  if (request.method === 'GET') {
    const cacheKey = new Request(url.toString(), request);
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) return api.handleRequest(request, env, ctx);
    else if (url.pathname === '/admin' || url.pathname.startsWith('/static')) return admin.handleRequest(request, env, ctx);
    else return handleRequest(request, env, ctx);
  },
};
