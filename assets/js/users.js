// assets/js/users.js
(function () {
  const tbody      = document.getElementById('userBody');
  const btnNewUser = document.getElementById('btnNewUser');

  // kalau tidak ada tabel pengguna, keluar
  if (!tbody || !btnNewUser) return;

  const PRIMARY_MASTER_EMAIL = 'admin@a2r';

  const modalId   = 'userModal';
  const mTitle    = document.getElementById('userModalTitle');
  const inpName   = document.getElementById('uName');
  const inpEmail  = document.getElementById('uEmail');
  const inpPass   = document.getElementById('uPass');
  const selRole   = document.getElementById('uRole');
  const btnSave   = document.getElementById('btnSaveUser');

  const session   = Store.get(LS_KEYS.SESSION, null);

  let editingEmail = null; // email user yang sedang diedit (sebelum diubah)

  /* ================== HELPER HAK AKSES ================== */

  function isPrimaryMasterSession() {
    return (
      session &&
      session.role === 'master' &&
      session.email === PRIMARY_MASTER_EMAIL
    );
  }

  function isTargetPrimaryMaster(user) {
    return user.role === 'master' && user.email === PRIMARY_MASTER_EMAIL;
  }

  /**
   * Cek apakah session sekarang boleh mengelola user target
   * action: 'edit' | 'delete'
   */
  function canManageUser(target, action) {
    if (!session || session.role !== 'master') return false;

    const isPrimarySession = isPrimaryMasterSession();
    const targetIsPrimary  = isTargetPrimaryMaster(target);

    // PRIMARY MASTER (admin@a2r)
    if (targetIsPrimary) {
      // tidak boleh dihapus sama sekali
      if (action === 'delete') return false;
      // hanya diri sendiri (session primary) yang boleh edit
      return isPrimarySession && session.email === target.email;
    }

    // USER ROLE MASTER (bukan primary)
    if (target.role === 'master') {
      // hanya primary master yang boleh edit/hapus admin master lain
      return isPrimarySession;
    }

    // STAFF
    // semua master boleh mengelola staff
    return session.role === 'master';
  }

  /* ================== LOAD & SAVE ================== */

  function getUsers() {
    return Store.get(LS_KEYS.USERS, []);
  }

  function setUsers(list) {
    Store.set(LS_KEYS.USERS, list);
  }

  /* ================== RENDER TABEL ================== */

  function render() {
    const users = getUsers();

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="4">Belum ada data</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const canEdit   = canManageUser(u, 'edit');
      const canDelete = canManageUser(u, 'delete');

      const editBtn = canEdit
        ? `<button class="btn-secondary btn-xs" data-edit="${u.email}">Edit</button>`
        : '';

      const delBtn = canDelete
        ? `<button class="btn-danger btn-xs ml-1" data-del="${u.email}">Hapus</button>`
        : '';

      return `
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
          <td class="text-right">
            ${editBtn || delBtn ? `${editBtn} ${delBtn}` : '<span class="text-xs text-slate-400">Tidak dapat diubah</span>'}
          </td>
        </tr>`;
    }).join('');
  }

  /* ================== MODAL FORM ================== */

  function openNewUser() {
    editingEmail = null;
    if (mTitle) mTitle.textContent = 'Pengguna Baru';
    if (inpName)  inpName.value  = '';
    if (inpEmail) {
      inpEmail.value   = '';
      inpEmail.disabled = false;
    }
    if (inpPass)  inpPass.value  = '';
    if (selRole) {
      selRole.value    = 'staff';
      selRole.disabled = false;
    }
    Modal.open(modalId);
  }

  function openEditUser(email) {
    const users = getUsers();
    const user  = users.find(u => u.email === email);
    if (!user) {
      Toast?.show?.('Pengguna tidak ditemukan') || alert('Pengguna tidak ditemukan');
      return;
    }

    if (!canManageUser(user, 'edit')) {
      Toast?.show?.('Anda tidak berhak mengedit pengguna ini') || alert('Anda tidak berhak mengedit pengguna ini');
      return;
    }

    editingEmail = email;

    if (mTitle) mTitle.textContent = 'Edit Pengguna';
    if (inpName)  inpName.value  = user.name || '';
    if (inpEmail) {
      inpEmail.value   = user.email || '';
      // email primary master tidak boleh diganti
      inpEmail.disabled = isTargetPrimaryMaster(user);
    }
    if (inpPass)  inpPass.value  = user.password || '';
    if (selRole) {
      selRole.value    = user.role || 'staff';
      // role primary master tidak boleh diganti
      selRole.disabled = isTargetPrimaryMaster(user);
    }

    Modal.open(modalId);
  }

  function handleSave() {
    const name  = (inpName?.value || '').trim();
    const email = (inpEmail?.value || '').trim();
    const pass  = (inpPass?.value || '').trim();
    const role  = selRole?.value || 'staff';

    if (!name || !email || !pass) {
      Toast?.show?.('Nama, email, dan password wajib diisi') || alert('Nama, email, dan password wajib diisi');
      return;
    }

    let users = getUsers();

    // Validasi duplikasi email
    const exists = users.some(u => u.email === email && u.email !== editingEmail);
    if (exists) {
      Toast?.show?.('Email sudah digunakan') || alert('Email sudah digunakan');
      return;
    }

    if (!editingEmail) {
      // tambah baru
      const newUser = { name, email, password: pass, role };
      if (!canManageUser(newUser, 'edit')) {
        Toast?.show?.('Anda tidak berhak membuat pengguna dengan role ini') || alert('Anda tidak berhak membuat pengguna dengan role ini');
        return;
      }
      users.push(newUser);
    } else {
      // update
      const idx = users.findIndex(u => u.email === editingEmail);
      if (idx === -1) {
        Toast?.show?.('Pengguna tidak ditemukan') || alert('Pengguna tidak ditemukan');
        return;
      }

      const target = users[idx];

      if (!canManageUser(target, 'edit')) {
        Toast?.show?.('Anda tidak berhak mengedit pengguna ini') || alert('Anda tidak berhak mengedit pengguna ini');
        return;
      }

      // jika target primary, paksa tetap master + email awal
      if (isTargetPrimaryMaster(target)) {
        users[idx] = {
          ...target,
          name,
          password: pass
          // email & role tidak diubah
        };
      } else {
        users[idx] = {
          ...target,
          name,
          email,
          password: pass,
          role
        };
      }
    }

    setUsers(users);
    Modal.close(modalId);
    render();
    Toast?.show?.('Data pengguna tersimpan') || console.log('saved');
  }

  function handleDelete(email) {
    const users = getUsers();
    const user  = users.find(u => u.email === email);
    if (!user) {
      Toast?.show?.('Pengguna tidak ditemukan') || alert('Pengguna tidak ditemukan');
      return;
    }

    if (!canManageUser(user, 'delete')) {
      Toast?.show?.('Anda tidak berhak menghapus pengguna ini') || alert('Anda tidak berhak menghapus pengguna ini');
      return;
    }

    if (!confirm(`Hapus pengguna "${user.name}"?`)) return;

    const filtered = users.filter(u => u.email !== email);
    setUsers(filtered);
    render();
    Toast?.show?.('Pengguna berhasil dihapus') || console.log('deleted');
  }

  /* ================== EVENT LISTENER ================== */

  btnNewUser.addEventListener('click', openNewUser);
  btnSave?.addEventListener('click', handleSave);

  // klik Edit / Hapus pada tabel
  tbody.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('[data-edit]');
    const btnDel  = e.target.closest('[data-del]');

    if (btnEdit) {
      const email = btnEdit.getAttribute('data-edit');
      openEditUser(email);
    } else if (btnDel) {
      const email = btnDel.getAttribute('data-del');
      handleDelete(email);
    }
  });

  /* ================== INIT ================== */
  render();
})();
