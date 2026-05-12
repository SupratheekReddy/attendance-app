// admin.js — Multi-view dashboard with drill-down
(function () {
  const API_BASE = 'https://theprintshoppe-api.onrender.com';
  // Elements
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const adminPass = document.getElementById('adminPass');
  const loginBtn = document.getElementById('loginBtn');
  const breadcrumbs = document.getElementById('breadcrumbs');
  
  const usersContainer = document.getElementById('usersContainer');
  const filterContainer = document.getElementById('filterContainer');
  const monthsContainer = document.getElementById('monthsContainer');
  const daysContainer = document.getElementById('daysContainer');
  
  const userGrid = document.getElementById('userGrid');
  const todayBody = document.getElementById('todayBody');
  const monthList = document.getElementById('monthList');
  const daysBody = document.getElementById('daysBody');
  
  const selectedUserName = document.getElementById('selectedUserName');
  const selectedUserId = document.getElementById('selectedUserId');
  const selectedMonthName = document.getElementById('selectedMonthName');
  
  const statTotalDays = document.getElementById('statTotalDays');
  const statTotalTime = document.getElementById('statTotalTime');
  const statPresentCount = document.getElementById('statPresentCount');
  const statAbsentCount = document.getElementById('statAbsentCount');
  
  const loadingOverlay = document.getElementById('loadingOverlay');
  const statusBar = document.getElementById('statusBar');
  const statusMsg = document.getElementById('statusMsg');

  // State
  let password = '';
  let users = [];
  let todayLogs = [];
  let selectedUser = null;
  let activeFilter = 'all'; // 'all', 'present', 'absent'

  function showStatus(msg, type) {
    statusBar.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 show ' + type;
    statusMsg.textContent = msg;
    statusBar.classList.remove('hidden');
    setTimeout(() => { statusBar.classList.add('hidden'); }, 4000);
  }

  function showLoading(show) {
    loadingOverlay.classList.toggle('hidden', !show);
    loadingOverlay.classList.toggle('flex', show);
  }

  // Login handler
  loginBtn.onclick = async () => {
    const pass = adminPass.value;
    if (!pass) return alert('Enter password');
    
    showLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users?password=${encodeURIComponent(pass)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      password = pass;
      users = data;
      
      loginView.classList.add('hidden');
      dashboardView.classList.remove('hidden');
      switchView('users');
    } catch (err) {
      alert(err.message);
    } finally {
      showLoading(false);
    }
  };

  function switchView(view) {
    [usersContainer, filterContainer, monthsContainer, daysContainer].forEach(c => c.classList.add('hidden'));
    if (view === 'users') {
      usersContainer.classList.remove('hidden');
      breadcrumbs.innerHTML = '<span class="text-primary font-black uppercase tracking-widest text-[10px]">Employees</span>';
      fetchTodayLogs();
    } else if (view === 'filter') {
      filterContainer.classList.remove('hidden');
    } else if (view === 'months') {
      monthsContainer.classList.remove('hidden');
      breadcrumbs.innerHTML = `
        <span class="text-primary cursor-pointer hover:underline text-[10px] uppercase font-black tracking-widest" onclick="window.switchView('users')">Employees</span>
        <span class="text-gray-300 mx-1 text-[10px]">/</span>
        <span class="text-gray-400 text-[10px] uppercase font-black tracking-widest">${selectedUser.name}</span>
      `;
    } else if (view === 'days') {
      daysContainer.classList.remove('hidden');
    }
  }
  window.switchView = switchView;

  async function fetchTodayLogs() {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/today?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      todayLogs = data;
      renderStats();
      renderTodayTable();
      renderUserList();
    } catch (err) {
      console.error('Today fetch error:', err);
    }
  }

  function renderStats() {
    const presentUserIds = new Set(todayLogs.map(l => l.userId));
    statPresentCount.textContent = presentUserIds.size;
    statAbsentCount.textContent = Math.max(0, users.length - presentUserIds.size);
  }

  // Filtering & Search Logic
  document.getElementById('userSearch').oninput = (e) => {
    renderUserList(e.target.value.toLowerCase());
  };

  document.getElementById('statPresentCard').onclick = () => showFilteredView('present');
  document.getElementById('statAbsentCard').onclick = () => showFilteredView('absent');

  function showFilteredView(type) {
    const presentUserIds = new Set(todayLogs.map(l => l.userId));
    const list = type === 'present' 
      ? users.filter(u => presentUserIds.has(u.userId))
      : users.filter(u => !presentUserIds.has(u.userId));

    document.getElementById('filterTitle').textContent = type === 'present' ? 'Present Today' : 'Absent Today';
    document.getElementById('filterSubtitle').textContent = `${list.length} Employees Total`;
    
    const filterList = document.getElementById('filterList');
    filterList.innerHTML = '';
    
    list.forEach(user => {
      const div = document.createElement('div');
      div.className = 'tonal-card rounded-2xl p-4 border border-gray-100 flex items-center justify-between';
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center font-black text-primary text-xs">
            ${user.name.charAt(0)}
          </div>
          <div class="font-bold text-gray-900">${user.name}</div>
        </div>
        <div class="text-[10px] font-black uppercase text-gray-400">${user.userId}</div>
      `;
      div.onclick = () => handleUserClick(user);
      filterList.appendChild(div);
    });
    
    switchView('filter');
  }

  function renderTodayTable() {
    todayBody.innerHTML = '';
    if (todayLogs.length === 0) {
      todayBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400 font-bold italic text-xs">No activity yet.</td></tr>';
      return;
    }

    todayLogs.forEach(log => {
      const tr = document.createElement('tr');
      const initials = log.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      
      tr.innerHTML = `
        <td>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-black text-[10px]">${initials}</div>
            <div class="font-bold text-gray-900">${log.name}</div>
          </div>
        </td>
        <td>${formatTime(log.entryTime)}</td>
        <td>${formatTime(log.exitTime)}</td>
        <td>
          ${log.exitTime ? `<button onclick="window.resetExitTime('${log.userId}', '${log.date}')" class="text-primary material-symbols-outlined text-lg">history</button>` : '—'}
        </td>
      `;
      todayBody.appendChild(tr);
    });
  }

  function renderUserList(searchTerm = '') {
    userGrid.innerHTML = '';
    const presentUserIds = new Set(todayLogs.map(l => l.userId));

    users.forEach(user => {
      // Apply Search Filter
      if (searchTerm && !user.name.toLowerCase().includes(searchTerm) && !user.userId.toLowerCase().includes(searchTerm)) {
        return;
      }

      const isPresent = presentUserIds.has(user.userId);

      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const card = document.createElement('div');
      card.className = `tonal-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] transition-all border-2 ${isPresent ? 'border-tertiary/20 bg-tertiary/5' : 'border-gray-50'} flex flex-col items-center text-center relative overflow-hidden`;
      
      if (isPresent) {
        card.innerHTML += `<div class="absolute top-0 right-0 bg-tertiary text-white text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-widest">In</div>`;
      }

      card.innerHTML += `
        <div class="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-black text-lg mb-3">
          ${initials}
        </div>
        <h3 class="font-black text-gray-900 text-sm">${user.name}</h3>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${user.userId}</p>
      `;
      card.onclick = () => handleUserClick(user);
      userGrid.appendChild(card);
    });
  }

  async function handleUserClick(user) {
    selectedUser = user;
    selectedUserName.textContent = user.name;
    selectedUserId.textContent = user.userId;
    switchView('months');
    
    showLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/logs?userId=${user.userId}&password=${encodeURIComponent(password)}`);
      const logs = await res.json();
      renderMonthList(logs);
    } catch (err) {
      alert(err.message);
    } finally {
      showLoading(false);
    }
  }

  function renderMonthList(logs) {
    monthList.innerHTML = '';
    // Group by month
    const groups = {};
    logs.forEach(log => {
      const month = log.date.substring(0, 7); // "YYYY-MM"
      if (!groups[month]) groups[month] = [];
      groups[month].push(log);
    });

    const months = Object.keys(groups).sort().reverse();
    months.forEach(m => {
      const logsInMonth = groups[m];
      const monthDisplay = new Date(m + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' });
      
      const div = document.createElement('div');
      div.className = 'tonal-card rounded-2xl p-6 border border-gray-100 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between group';
      div.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-primary/5 text-gray-400 group-hover:text-primary flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined">calendar_month</span>
          </div>
          <div>
            <div class="font-black text-gray-900 group-hover:text-primary transition-colors">${monthDisplay}</div>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${logsInMonth.length} Days Recorded</div>
          </div>
        </div>
        <span class="material-symbols-outlined text-gray-300 group-hover:text-primary transition-all group-hover:translate-x-1">arrow_forward_ios</span>
      `;
      div.onclick = () => showMonthDetail(monthDisplay, logsInMonth);
      monthList.appendChild(div);
    });
  }

  function showMonthDetail(name, logs) {
    selectedMonthName.textContent = name;
    switchView('days');
    
    // Calculate Stats
    statTotalDays.textContent = logs.length;
    let totalMinutes = 0;
    logs.forEach(log => {
      if (log.entryTime && log.exitTime) {
        totalMinutes += (new Date(log.exitTime) - new Date(log.entryTime)) / 60000;
      }
    });
    statTotalTime.textContent = Math.floor(totalMinutes / 60) + 'h ' + Math.floor(totalMinutes % 60) + 'm';

    daysBody.innerHTML = '';
    logs.sort((a,b) => b.date.localeCompare(a.date)).forEach(log => {
      const tr = document.createElement('tr');
      const hrs = log.exitTime ? ((new Date(log.exitTime) - new Date(log.entryTime)) / 3600000).toFixed(1) + 'h' : '—';
      tr.innerHTML = `
        <td class="font-bold text-xs">${new Date(log.entryTime).toLocaleDateString([], {month:'short', day:'numeric'})}</td>
        <td>${formatTime(log.entryTime)}</td>
        <td class="text-xs">${log.exitTime ? new Date(log.exitTime).toLocaleDateString([], {month:'short', day:'numeric'}) : '—'}</td>
        <td>${formatTime(log.exitTime)}</td>
        <td class="font-black text-primary">${hrs}</td>
        <td>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${log.status === 'present' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'}">
            ${log.status}
          </span>
        </td>
      `;
      daysBody.appendChild(tr);
    });
    
    renderCalendar(name, logs);
  }

  function renderCalendar(monthDisplay, logs) {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';
    
    // Add day headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      const div = document.createElement('div');
      div.className = 'text-[10px] font-black text-gray-400 uppercase mb-2';
      div.textContent = day;
      calendarGrid.appendChild(div);
    });

    const [monthName, year] = monthDisplay.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Padding for first day of week
    for (let i = 0; i < firstDay; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayLogs = logs.filter(l => l.date === dateStr);
      
      // Check if this day is part of a night shift (ended today but started yesterday)
      const isEndOfNightShift = logs.some(l => {
        if (!l.exitTime) return false;
        const exitDate = new Date(l.exitTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return exitDate === dateStr && l.date !== dateStr;
      });

      // Check if this day's shift is a night shift (starts today but ends tomorrow)
      const isStartOfNightShift = dayLogs.some(l => {
        if (!l.exitTime) return false;
        const entryDate = new Date(l.entryTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const exitDate = new Date(l.exitTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return entryDate === dateStr && exitDate !== dateStr;
      });

      const dayEl = document.createElement('div');
      dayEl.className = 'aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold relative';
      
      const label = document.createElement('span');
      label.textContent = day;
      dayEl.appendChild(label);

      if (isStartOfNightShift || isEndOfNightShift) {
        // Night Shift = Question Mark
        dayEl.classList.add('bg-gray-50', 'text-gray-400');
        const qm = document.createElement('span');
        qm.textContent = '?';
        qm.className = 'absolute -top-1 -right-1 bg-white shadow-sm rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400 border border-gray-100';
        dayEl.appendChild(qm);
      } else if (dayLogs.length > 0) {
        // Present = Green Circle
        dayEl.classList.add('bg-tertiary/10', 'text-tertiary');
        const dot = document.createElement('span');
        dot.className = 'w-1.5 h-1.5 rounded-full bg-tertiary mt-0.5';
        dayEl.appendChild(dot);
      } else {
        // Absent = Red Circle (Subtle)
        dayEl.classList.add('bg-primary/5', 'text-primary/40');
      }

      calendarGrid.appendChild(dayEl);
    }
  }

  // Global actions
  window.resetExitTime = async (userId, date) => {
    if (!confirm(`Reset exit time for ${userId} on ${date}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/attendance/reset-exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, userId, date })
      });
      if (!res.ok) throw new Error('Reset failed');
      showStatus('Exit time reset!', 'success');
      fetchTodayLogs();
    } catch (err) { alert(err.message); }
  };

  document.getElementById('deleteUserBtn').onclick = async () => {
    if (!confirm(`PERMANENTLY DELETE ${selectedUser.name} and all logs?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/user/${selectedUser.userId}?password=${encodeURIComponent(password)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      alert('User deleted');
      switchView('users');
    } catch (err) { alert(err.message); }
  };

  document.getElementById('backToUsers').onclick = () => switchView('users');
  document.getElementById('backToMonths').onclick = () => switchView('months');

  function formatTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

})();
