// Firebase init
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser, EmailAuthProvider, 
  reauthenticateWithCredential  } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase, ref, set, remove, onValue } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
  authDomain: "perpustakaan-web.firebaseapp.com",
  databaseURL: "https://perpustakaan-web-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "perpustakaan-web",
  storageBucket: "perpustakaan-web.firebasestorage.app",
  messagingSenderId: "39289548587",
  appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Cek jika user adalah admin utama
let currentUserIsAdminUtama = false;

onAuthStateChanged(auth, user => {
  if (user) {
    const userRef = ref(db, 'admin/' + user.uid);
    onValue(userRef, snapshot => {
      const userData = snapshot.val();
      if (userData && userData.role === 'admin_utama') {
        currentUserIsAdminUtama = true;
      }
      loadAdminTable();
    });
  }
});

// Tambah admin baru
const addAdminForm = document.getElementById('add-admin-form');
if (addAdminForm) {
  addAdminForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validasi admin utama
    if (!currentUserIsAdminUtama) {
      await Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Hanya admin utama yang dapat menambahkan admin baru.',
        confirmButtonColor: '#d33',
        confirmButtonText: 'Mengerti'
      });
      return;
    }

    const name = document.getElementById('admin-name').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    try {
      // Tampilkan loading
      const loadingAlert = Swal.fire({
        title: 'Menambahkan Admin...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = userCredential.user.uid;

      await set(ref(db, 'admin/' + newUserId), {
        name: name,
        email: email,
        role: 'admin',
        createdAt: new Date().toISOString(),
      });

      // Tutup loading
      await loadingAlert.close();

      // Notifikasi sukses
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        html: `
          <div style="text-align:center;">
            <p><strong>${name}</strong> berhasil ditambahkan sebagai admin</p>
            <p style="font-size:14px;color:#777;">Email: ${email}</p>
          </div>
        `,
        confirmButtonColor: '#4CAF50',
        confirmButtonText: 'OK'
      });

      // Reset form dan tutup modal
      addAdminForm.reset();
      document.getElementById('add-admin-modal').style.display = 'none';
      loadAdminTable();

    } catch (error) {
      let errorMessage = "Gagal menambahkan admin";
      
      // Custom error messages
      switch(error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Email sudah terdaftar";
          break;
        case "auth/weak-password":
          errorMessage = "Password terlalu lemah (minimal 6 karakter)";
          break;
        case "auth/invalid-email":
          errorMessage = "Format email tidak valid";
          break;
        default:
          errorMessage = error.message;
      }

      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        html: `
          <div style="text-align:center;">
            <p>${errorMessage}</p>
            ${error.code === 'auth/weak-password' ? 
              '<p style="font-size:14px;color:#777;">Gunakan password yang lebih kuat</p>' : ''}
          </div>
        `,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Mengerti'
      });
    }
  });
}

// Tampilkan tabel admin
function loadAdminTable(keyword = '') {
  const tableBody = document.getElementById('admin-table-body');
  if (!tableBody) return;

  onValue(ref(db, 'admin'), snapshot => {
    tableBody.innerHTML = '';
    const lowerKeyword = keyword.toLowerCase();

    snapshot.forEach(childSnapshot => {
      const userId = childSnapshot.key;
      const data = childSnapshot.val();

      const name = data.name.toLowerCase();
      const email = data.email.toLowerCase();

      if (keyword && !name.includes(lowerKeyword) && !email.includes(lowerKeyword)) {
        return; // skip jika tidak match
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>${new Date(data.createdAt).toLocaleDateString()}</td>
        <td>
          ${currentUserIsAdminUtama && data.role !== 'admin_utama' ? `
            <button class="delete-btn" onclick="hapusAdmin('${userId}', '${data.name.replace(/'/g, "\\'")}')">
              <i class="fas fa-trash-alt"></i> Delete
            </button>` : ''}
        </td>
      `;
      tableBody.appendChild(row);
    });
  });
}

// Pencarian realtime saat mengetik
document.getElementById('admin-search').addEventListener('input', () => {
  const keyword = document.getElementById('admin-search').value.trim();
  loadAdminTable(keyword);
});

// Tombol search tetap bisa dipakai jika diperlukan
document.getElementById('search-btn').addEventListener('click', () => {
  const keyword = document.getElementById('admin-search').value.trim();
  loadAdminTable(keyword);
});

// Tombol reset untuk menampilkan semua data kembali
document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('admin-search').value = '';
  loadAdminTable();
});
 
// Hapus admin dari Realtime DB 
window.hapusAdmin = function (userId, name) {
  Swal.fire({
    title: 'Hapus Admin',
    html: `Anda yakin ingin menghapus admin <b>${name}</b>?`,
    icon: 'warning',
    showCancelButton: true,
    showCloseButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      remove(ref(db, 'admin/' + userId))
        .then(() => {
          Swal.fire({
            title: 'Berhasil!',
            text: `Admin ${name} telah dihapus.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          loadAdminTable();
        })
        .catch(error => {
          Swal.fire({
            title: 'Gagal!',
            html: `Gagal menghapus admin <b>${name}</b>.<br><br>Error: ${error.message}`,
            icon: 'error'
          });
        });
    }
  });
};

// Fungsi logout
document.getElementById('logout').addEventListener("click", (e) => {
    e.preventDefault();

    Swal.fire({
        title: 'Yakin ingin logout?',
        text: "Anda akan keluar dan kembali ke halaman login.",
        icon: 'warning',
        showCancelButton: true,
        showCloseButton: true, // ikon X
        allowOutsideClick: true, // klik di luar = batal
        allowEscapeKey: true, // tekan ESC = batal
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, logout',
        cancelButtonText: 'Tidak'
    }).then((result) => {
        // Pastikan hanya logout jika tombol 'Ya' ditekan
        if (result.isConfirmed) {
            signOut(auth).then(() => {
                sessionStorage.removeItem('currentUser');
                window.location.href = "login.html";
            }).catch((error) => {
                console.error("Gagal logout:", error);
                Swal.fire('Gagal', error.message, 'error');
            });
        }
        // Jika dibatalkan (klik luar, tombol Tidak, atau X), tidak melakukan apa-apa
    });
});


