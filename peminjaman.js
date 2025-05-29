import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variabel global untuk user
let currentUser = null;

// Fungsi untuk memformat status
function getStatusDisplay(status) {
    switch (status) {
        case 'Menunggu': return { text: 'Menunggu Konfirmasi', class: 'status-waiting' };
        case 'Disetujui': return { text: 'Sedang Dipinjam', class: 'status-approved' };
        case 'Dipinjam': return { text: 'Sedang Dipinjam', class: 'status-approved' };
        case 'Selesai': return { text: 'Sudah Dikembalikan', class: 'status-completed' };
        case 'Ditolak': return { text: 'Ditolak', class: 'status-rejected' };
        case 'Dibatalkan': return { text: 'Dibatalkan', class: 'status-canceled' };
        default: return { text: status, class: 'status-waiting' };
    }
}

// Fungsi untuk memuat riwayat peminjaman
async function fetchUserLoans(filter = 'all') {
    const loansContainer = document.getElementById('loans-container');
    loansContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Memuat riwayat peminjaman...
                </div>
            `;

    try {
        if (!currentUser) {
            throw new Error('User belum login');
        }

        // Buat query berdasarkan filter
        let loansQuery = query(
            collection(db, 'book_loans'),
            where('user.uid', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        if (filter === 'Disetujui') {
            loansQuery = query(
                loansQuery,
                where('status', 'in', ['Disetujui', 'Dipinjam'])
            );
        } else if (filter !== 'all') {
            loansQuery = query(loansQuery, where('status', '==', filter));
        }

        const querySnapshot = await getDocs(loansQuery);

        if (querySnapshot.empty) {
            loansContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-book-open"></i>
                            <h3>Tidak ada riwayat peminjaman</h3>
                            <p>Anda belum memiliki riwayat peminjaman buku</p>
                        </div>
                    `;
            return;
        }

        loansContainer.innerHTML = '';

        querySnapshot.forEach((doc, index) => {
            const loan = doc.data();
            const loanId = doc.id;

            // Format nomor peminjaman
            const loanNumber = `PJM-${String(index + 1).padStart(3, '0')}`;

            // Dapatkan tampilan status
            const statusDisplay = getStatusDisplay(loan.status);

            // Buat elemen kartu peminjaman
            const loanCard = document.createElement('div');
            loanCard.className = 'loan-card';
            loanCard.innerHTML = `
                        <h2>Peminjaman ${loanNumber}</h2>
                        
                        <div class="loan-info">
                            <p><strong>Judul Buku:</strong> ${loan.book.title}</p>
                            <p><strong>Pengarang:</strong> ${loan.book.author}</p>
                            <p><strong>Kode Buku:</strong> ${loan.book.code}</p>
                            <p><strong>Tanggal Pinjam:</strong> ${loan.dates.loan}</p>
                            <p><strong>Batas Kembali:</strong> ${loan.dates.return}</p>
                            <p><strong>Status:</strong> 
                                <span class="status ${statusDisplay.class}">${statusDisplay.text}</span>
                            </p>
                            ${loan.dates.returned ? `<p><strong>Dikembalikan:</strong> ${loan.dates.returned}</p>` : ''}
                            ${loan.fine > 0 ? `<p><strong>Denda:</strong> Rp${loan.fine.toLocaleString('id-ID')}</p>` : ''}
                        </div>
                        
                        ${loan.status === 'Menunggu' ? `
                        <div class="loan-actions">
                            <button class="btn-cancel" data-loan-id="${loanId}">
                                <i class="fas fa-times"></i> Batalkan Peminjaman
                            </button>
                        </div>
                        ` : ''}

                        ${(loan.status === 'Dipinjam' || loan.status === 'Disetujui') ? `
                        <div class="loan-actions">
                            <button class="btn-return" data-loan-id="${loanId}">
                                 <i class="fas fa-undo"></i> Kembalikan Buku
                            </button>
                        </div>
                         ` : ''}
                    `;

            loansContainer.appendChild(loanCard);

            // Tambahkan event listener untuk tombol batalkan
            if (loan.status === 'Menunggu') {
                loanCard.querySelector('.btn-cancel').addEventListener('click', () => cancelLoan(loanId));
            }

            // Tambahkan event listener untuk tombol kembalikan
            if (loan.status === 'Dipinjam' || loan.status === 'Disetujui') {
                loanCard.querySelector('.btn-return').addEventListener('click', () => returnBook(loanId));
            }
        });

    } catch (error) {
        console.error("Error fetching loans:", error);
        loansContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Gagal memuat riwayat peminjaman</h3>
                        <p>${error.message}</p>
                    </div>
                `;
    }
}

// Fungsi untuk mengembalikan buku
async function returnBook(loanId) {
    try {
        const result = await Swal.fire({
            title: 'Konfirmasi Pengembalian',
            text: 'Apakah Anda yakin ingin mengembalikan buku ini?',
            icon: 'question',
            showCancelButton: true,
            showCloseButton: true,
            confirmButtonText: 'Ya, kembalikan',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            // Update status peminjaman menjadi "Selesai"
            await updateDoc(doc(db, 'book_loans', loanId), {
                status: 'Selesai',
                'dates.returned': new Date().toISOString().split('T')[0] // Tambahkan tanggal pengembalian
                // Anda bisa menambahkan logika perhitungan denda di sini jika perlu
            });

            Swal.fire(
                'Berhasil!',
                'Buku telah berhasil dikembalikan.',
                'success'
            ).then(() => {
                fetchUserLoans(); // Refresh daftar peminjaman
            });
        }
    } catch (error) {
        console.error("Error returning book:", error);
        Swal.fire(
            'Gagal!',
            'Terjadi kesalahan saat mengembalikan buku.',
            'error'
        );
    }
}

// Fungsi untuk membatalkan peminjaman
async function cancelLoan(loanId) {
    const result = await Swal.fire({
         title: 'Konfirmasi Pembatalan',
            text: 'Apakah Anda yakin ingin membatalkan peminjaman buku ini?',
            icon: 'warning',
            showCancelButton: true,
            showCloseButton: true,
            confirmButtonText: 'Ya, batalkan',
            cancelButtonText: 'Tidak'
    });

    if (!result.isConfirmed) return;

    try {
        // Tampilkan loading selama proses
        Swal.fire({
            title: 'Memproses...',
            html: 'Sedang membatalkan peminjaman',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Update status peminjaman
        await updateDoc(doc(db, 'book_loans', loanId), {
            status: "Dibatalkan",
            updatedAt: serverTimestamp(),
            canceledBy: "user",
            cancellationDate: new Date().toISOString()
        });

        // Notifikasi sukses
        await Swal.fire({
            title: 'Berhasil!',
            html: `
                <div style="text-align:center;">
                    <i class="fas fa-check-circle" style="font-size:60px;color:#4CAF50;margin-bottom:20px;"></i>
                    <p style="font-size:18px;">Peminjaman berhasil dibatalkan</p>
                </div>
            `,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
            willClose: () => {
                // Refresh data dengan filter aktif
                const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                fetchUserLoans(activeFilter);
            }
        });

    } catch (error) {
        console.error("Error canceling loan:", error);
        
        // Notifikasi error
        await Swal.fire({
            title: 'Gagal!',
            html: `
                <div style="text-align:center;">
                    <i class="fas fa-times-circle" style="font-size:60px;color:#f44336;margin-bottom:20px;"></i>
                    <p style="font-size:18px;">Gagal membatalkan peminjaman</p>
                    <p style="font-size:14px;color:#777;">${error.message}</p>
                </div>
            `,
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#4CAF50'
        });
    }
}

// Event listener untuk filter
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        fetchUserLoans(btn.dataset.filter);
    });
});

// Search Functionality
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('search-bar-input');
    const searchButton = document.getElementById('search-button');
    const bookGrid = document.querySelector('.book-grid');

    // Buat elemen pesan tidak ditemukan dengan animasi
    const notFoundMessage = document.createElement('div');
    notFoundMessage.className = 'not-found-message';
    notFoundMessage.style.cssText = `
        display: none;
        text-align: center;
        padding: 30px;
        background: #f9f9f9;
        border-radius: 10px;
        margin: 20px auto;
        max-width: 500px;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    notFoundMessage.innerHTML = `
        <i class="fas fa-search" style="font-size: 50px; color: #ff6b6b; margin-bottom: 15px;"></i>
        <h3 style="color: #333; margin-bottom: 10px;">Hasil Tidak Ditemukan</h3>
        <p style="color: #666;">Kami tidak menemukan buku dengan kata kunci "<span id="search-keyword" style="font-weight: bold;"></span>"</p>
        <p style="color: #888; margin-top: 10px;">Coba cari dengan kata kunci lain atau periksa ejaan Anda.</p>
    `;
    bookGrid.parentNode.insertBefore(notFoundMessage, bookGrid.nextSibling);

    function scrollToResults() {
        let targetElement;
        const anyResults = document.querySelector('.book-card[style*="display: block"]');

        if (notFoundMessage.style.display === 'block') {
            targetElement = notFoundMessage;
        } else if (anyResults) {
            targetElement = bookGrid;
        } else {
            targetElement = searchInput; // Fallback ke search input
        }

        const offset = 100; // Sesuaikan dengan tinggi navbar/header
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }

    function showNotFoundMessage(keyword) {
        document.getElementById('search-keyword').textContent = keyword;
        notFoundMessage.style.display = 'block';
        setTimeout(() => {
            notFoundMessage.style.opacity = '1';
            scrollToResults();
        }, 10);
        bookGrid.style.opacity = '0.5';
    }

    function hideNotFoundMessage() {
        notFoundMessage.style.opacity = '0';
        setTimeout(() => {
            notFoundMessage.style.display = 'none';
        }, 300);
        bookGrid.style.opacity = '1';
    }

    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        let foundCount = 0;

        // Animasi loading
        bookGrid.style.opacity = '0.5';
        bookGrid.style.transition = 'opacity 0.2s ease';

        setTimeout(() => {
            document.querySelectorAll('.book-card').forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const author = card.querySelector('p').textContent.toLowerCase();

                if (searchTerm === '' || title.includes(searchTerm) || author.includes(searchTerm)) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeIn 0.3s ease';
                    foundCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (foundCount === 0 && searchTerm !== '') {
                showNotFoundMessage(searchTerm);
                // Scroll ke notFoundMessage sudah dipanggil di dalam showNotFoundMessage
            } else {
                hideNotFoundMessage();
                if (searchTerm !== '') {
                    // Hanya scroll jika ada action pencarian (bukan saat load awal)
                    setTimeout(scrollToResults, 300);
                }
            }
            bookGrid.style.opacity = '1';
        }, 200);
    }

    // Event listeners
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') performSearch();
    });

    // Reset saat input dikosongkan
    searchInput.addEventListener('input', function () {
        if (this.value.trim() === '') {
            hideNotFoundMessage();
            document.querySelectorAll('.book-card').forEach(card => {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease';
            });
        }
    });
});

// Cek status autentikasi saat halaman dimuat
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0]
        };
        // Muat data peminjaman awal (semua)
        fetchUserLoans();
    } else {
        // Redirect ke halaman login jika belum login
        window.location.href = "login-user.html";
    }
});

// JavaScript Logout dengan Konfirmasi
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Yakin ingin logout?',
            text: "Anda akan keluar dan kembali ke halaman login.",
            icon: 'warning',
            showCancelButton: true,
            showCloseButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, logout',
            cancelButtonText: 'Tidak'
        }).then((result) => {
            if (result.isConfirmed) {
                signOut(auth).then(() => {
                    sessionStorage.removeItem('currentUser');
                    window.location.href = "index.html";
                }).catch((error) => {
                    console.error("Gagal logout:", error);
                    Swal.fire('Gagal', error.message, 'error');
                });
            }
        });
    });
} else {
    console.warn("Elemen dengan ID 'logout-btn' tidak ditemukan.");
}

// Fungsi hapus akun
document.getElementById("delete-account-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();

    Swal.fire({
        title: 'Hapus Akun?',
        text: "Tindakan ini permanen dan tidak dapat dibatalkan!",
        icon: 'warning',
        showCancelButton: true,
        showCloseButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus akun',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const user = auth.currentUser;

            if (!user) {
                Swal.fire('Error', 'Tidak ada pengguna yang login.', 'error');
                return;
            }

            // 🔐 Prompt pengguna untuk konfirmasi email & password
            const { value: formValues } = await Swal.fire({
                title: 'Konfirmasi Identitas',
                width: '300px', // Fixed width that works well on all devices
                padding: '20px',
                backdrop: true,
                html: `
    <div style="
      display: flex; 
      flex-direction: column; 
      gap: 12px;
      width: 100%;
      padding: 0;
    ">
      <input id="swal-email" type="email" class="swal2-input" 
        placeholder="Email" 
        style="
          width: 100%; 
          box-sizing: border-box; 
          padding: 10px;
          margin: 0;
          font-size: 14px;
          border-radius: 4px;
          border: 1px solid #ddd;
        ">
        
      <input id="swal-password" type="password" class="swal2-input" 
        placeholder="Password" 
        style="
          width: 100%; 
          box-sizing: border-box; 
          padding: 10px;
          margin: 0;
          font-size: 14px;
          border-radius: 4px;
          border: 1px solid #ddd;
        ">
    </div>
  `,
                focusConfirm: false,
                showCancelButton: true,
                showCloseButton: true,
                confirmButtonText: 'Konfirmasi',
                cancelButtonText: 'Batal',
                preConfirm: () => {
                    const email = document.getElementById('swal-email').value;
                    const password = document.getElementById('swal-password').value;
                    if (!email || !password) {
                        Swal.showValidationMessage('Email dan password wajib diisi!');
                        return false;
                    }
                    return { email, password };
                }
            });

            if (!formValues) return; // Batal

            try {
                const credential = EmailAuthProvider.credential(formValues.email, formValues.password);
                await reauthenticateWithCredential(user, credential); // 🔄 Re-authenticate user

                // 🔥 Hapus data user dari Firestore
                await deleteDoc(doc(db, "users", user.uid));

                // 🔥 Hapus akun dari Authentication
                await deleteUser(user);

                Swal.fire('Sukses', 'Akun Anda telah dihapus.', 'success')
                    .then(() => {
                        sessionStorage.removeItem('currentUser');
                        window.location.href = "index.html";
                    });

            } catch (error) {
                console.error("Gagal menghapus akun:", error);
                Swal.fire('Gagal Menghapus', error.message, 'error');
            }
        }
    });
});
