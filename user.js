import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    orderBy,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    databaseURL: "https://perpustakaan-web-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Format tanggal dari ISO string
function formatDate(isoString) {
    if (!isoString) return '-';
    
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
}

// Fungsi untuk memuat data user
async function loadUsers(keyword = '') {
    const usersTable = document.getElementById('users-table');
    const notFoundMsg = document.getElementById('user-not-found');

    usersTable.innerHTML = '';
    if (notFoundMsg) notFoundMsg.style.display = 'none';

    const loadingRow = document.createElement('tr');
    loadingRow.innerHTML = '<td colspan="7" class="loading">Memuat data user...</td>';
    usersTable.appendChild(loadingRow);

    try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        // Clear table & re-append header
        usersTable.innerHTML = `
            <tr>
                <th>No</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
            </tr>
        `;

        if (querySnapshot.empty) {
            usersTable.innerHTML += `
                <tr>
                    <td colspan="7" class="no-data">Belum ada data user</td>
                </tr>
            `;
            return;
        }

        const lowerKeyword = keyword.toLowerCase();
        let counter = 1;
        let matchCount = 0;

        querySnapshot.forEach(doc => {
            const userData = doc.data();
            const name = (userData.name || '').toLowerCase();
            const username = (userData.username || '').toLowerCase();
            const email = (userData.email || '').toLowerCase();

            if (keyword && !name.includes(lowerKeyword) && !username.includes(lowerKeyword) && !email.includes(lowerKeyword)) {
                return; // Skip non-matching rows
            }

            matchCount++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${counter++}</td>
                <td>${userData.name || '-'}</td>
                <td>${userData.username || '-'}</td>
                <td>${userData.email || '-'}</td>
                <td>${userData.phoneNumber || '-'}</td>
                <td>${formatDate(userData.createdAt)}</td>
            `;
            usersTable.appendChild(row);
        });

        if (matchCount === 0) {
            const notFoundRow = document.createElement('tr');
            notFoundRow.innerHTML = `
                <td colspan="7" class="no-data">Tidak ada user yang ditemukan.</td>
            `;
            usersTable.appendChild(notFoundRow);
            if (notFoundMsg) notFoundMsg.style.display = 'block';
        }

    } catch (error) {
        console.error("Error loading users:", error);
        usersTable.innerHTML = `
            <tr>
                <th>No</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone HP</th>
                <th>Joined</th>
            </tr>
            <tr>
                <td colspan="7" class="error">Gagal memuat data user: ${error.message}</td>
            </tr>
        `;
    }
}

// Realtime pencarian saat mengetik
document.getElementById('user-search').addEventListener('input', () => {
    const keyword = document.getElementById('user-search').value.trim();
    loadUsers(keyword);
});

// Tombol Search
document.getElementById('search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('user-search').value.trim();
    loadUsers(keyword);
});

// Tombol Reset
document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('user-search').value = '';
    loadUsers();
});


// Check auth state before loading users
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, load data
        loadUsers();
        
        // Refresh data every 30 seconds (optional)
        setInterval(loadUsers, 30000);
    } else {
        // User is signed out, redirect to login
        window.location.href = 'login.html';
    }
});

// Export function untuk keperluan testing atau penggunaan lainnya
export { loadUsers, formatDate };

// Fungsi Logout
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
