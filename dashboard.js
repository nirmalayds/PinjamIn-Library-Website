import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { 
    getAuth,  
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore();
const auth = getAuth(app); 
const database = getDatabase(app);
const booksCollection = collection(db, 'books');
const loansCollection = collection(db, 'book_loans');
const usersCollection = collection(db, 'users');

// Cek apakah user sudah login
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        const adminRef = ref(database, 'admin/' + uid);

        // Ambil data admin dari database
        get(adminRef).then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById("admin-name").textContent = data.name || "Admin";
          } else {
            console.warn("Data admin tidak ditemukan di database.");
          }
        }).catch((error) => {
          console.error("Gagal mengambil data admin:", error);
        });
      } else {
        console.log("Belum login.");
        // Redirect ke halaman login
        window.location.href = "login.html";
      }
    });

// Load dashboard stats
async function loadDashboardStats() {
    try {
        // Total books
        const booksSnapshot = await getDocs(booksCollection);
        document.getElementById('total-books').textContent = booksSnapshot.size;

        // Borrowed books
        const loansSnapshot = await getDocs(loansCollection);
        document.getElementById('borrowed-books').textContent = loansSnapshot.size;

        // Registered Users
        const usersSnapshot = await getDocs(usersCollection);
        document.getElementById('total-users').textContent = usersSnapshot.size;

        // Load recent borrowings
        await loadRecentBorrowings();
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
    }
}

async function loadRecentBorrowings() {
    const table = document.getElementById('recent-borrowings');

    // Kosongkan tabel kecuali header
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    try {
        const q = query(loansCollection, orderBy('createdAt', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            addRowToTable(table, data, doc.id);
        });
    } catch (error) {
        console.error("Error getting recent borrowings:", error);
    }
}

function addRowToTable(table, data, docId) {
    const row = table.insertRow(-1);

    // Kolom Buku
    const cellBook = row.insertCell(0);
    cellBook.textContent = `${data.book?.title || 'N/A'} (${data.book?.code || 'N/A'})`;

    // Kolom Pengguna
    const cellUser = row.insertCell(1);
    cellUser.textContent = `${data.user?.name || 'N/A'} (${data.user?.email || 'N/A'})`;

    // Kolom Tanggal
    const cellDate = row.insertCell(2);
    cellDate.textContent = data.dates?.loan || 'N/A';

    // Kolom Status
    const cellStatus = row.insertCell(3);
    cellStatus.textContent = data.status || 'N/A';
    cellStatus.className = "status-" + (data.status?.toLowerCase().replace(" ", "-") || 'unknown');

    // Kolom Aksi
    const cellAction = row.insertCell(4);

    // Tambahkan tombol aksi berdasarkan status
    if (data.status === 'Menunggu') {
        const approveBtn = document.createElement('button');
        approveBtn.textContent = 'Setujui';
        approveBtn.className = 'action-btn approve';
        approveBtn.onclick = () => updateLoanStatus(docId, 'Dipinjam');
        cellAction.appendChild(approveBtn);

        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = 'Tolak';
        rejectBtn.className = 'action-btn reject';
        rejectBtn.onclick = () => updateLoanStatus(docId, 'Ditolak');
        cellAction.appendChild(rejectBtn);
    }
    else if (data.status === 'Dipinjam') {
        const returnBtn = document.createElement('button');
        returnBtn.textContent = 'Kembalikan';
        returnBtn.className = 'action-btn return';
        returnBtn.onclick = () => updateLoanStatus(docId, 'Dikembalikan');
        cellAction.appendChild(returnBtn);
    }
}

async function updateLoanStatus(docId, newStatus) {
    try {
        const loanRef = doc(db, 'book_loans', docId);
        const updateData = {
            status: newStatus,
            ...(newStatus === 'Dipinjam' && { 'dates.loan': new Date().toISOString() }),
            ...(newStatus === 'Dikembalikan' && { 'dates.returned': new Date().toISOString() })
        };

        await updateDoc(loanRef, updateData);
        console.log("Status updated successfully");
        loadRecentBorrowings(); // Refresh tabel
    } catch (error) {
        console.error("Error updating document:", error);
    }
}

// Call when page loads
window.onload = loadDashboardStats;

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
