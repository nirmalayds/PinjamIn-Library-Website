// Inisialisasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Akses jsPDF dari global window
const { jsPDF } = window.jspdf;

// Format tanggal
function formatDate(date) {
    if (!date) return '-';
    try {
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
}

// Fungsi umum untuk membuat PDF
async function generatePDFReport({ 
    title, 
    fromDate, 
    toDate, 
    headers, 
    data, 
    statusElementId,
    fileNamePrefix,
    headColor = [41, 128, 185]
}) {
    try {
        // Tampilkan loading
        document.getElementById(statusElementId).textContent = 'Membuat laporan...';
        
        // Buat dokumen PDF baru
        const doc = new jsPDF();
        
        // Judul laporan
        doc.setFontSize(18);
        doc.text(title.toUpperCase(), 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Periode: ${formatDate(fromDate)} - ${formatDate(toDate)}`, 105, 22, { align: 'center' });
        
        // Tambahkan tabel ke PDF
        doc.autoTable({
            head: [headers],
            body: data,
            startY: 30,
            styles: { fontSize: 10 },
            headStyles: { 
                fillColor: headColor, 
                textColor: 255 
            }
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Halaman ${i} dari ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
        
        // Simpan PDF
        doc.save(`${fileNamePrefix}_${formatDate(fromDate)}_${formatDate(toDate)}.pdf`);
        
        document.getElementById(statusElementId).textContent = 'Laporan berhasil dibuat!';
        setTimeout(() => {
            document.getElementById(statusElementId).textContent = '';
        }, 3000);
        
    } catch (error) {
        console.error(`Error generating ${title.toLowerCase()} report:`, error);
        alert(`Gagal membuat laporan: ${error.message}`);
        document.getElementById(statusElementId).textContent = '';
    }
}

// ==================== LAPORAN PEMINJAMAN ====================
async function generateBorrowingReport() {
    const fromDate = document.getElementById('borrowing-from-date').value;
    const toDate = document.getElementById('borrowing-to-date').value;
    
    if (!fromDate || !toDate) {
        alert('Harap pilih rentang tanggal!');
        return;
    }

    try {
        // Firebase v8 syntax
        const querySnapshot = await db.collection('circulation').get();
        
        if (querySnapshot.empty) {
            alert('Tidak ada data peminjaman pada rentang tanggal tersebut');
            return;
        }

        // Filter data berdasarkan tanggal secara manual
        const filteredData = querySnapshot.docs.filter(doc => {
            const record = doc.data();
            const borrowDate = record.borrowDate?.toDate();
            if (!borrowDate) return false;
            
            const from = new Date(fromDate);
            const to = new Date(toDate);
            return borrowDate >= from && borrowDate <= to;
        });

        if (filteredData.length === 0) {
            alert('Tidak ada data peminjaman pada rentang tanggal tersebut');
            return;
        }

        // Siapkan data untuk tabel
        const reportData = await Promise.all(filteredData.map(async (doc) => {
            const record = doc.data();
            // Firebase v8 syntax
            const [bookDoc, userDoc] = await Promise.all([
                db.collection('books').doc(record.bookId).get(),
                db.collection('users').doc(record.userId).get()
            ]);
            
            return {
                book: bookDoc.data()?.title || '-',
                borrower: userDoc.data()?.name || '-',
                borrowDate: formatDate(record.borrowDate?.toDate()),
                dueDate: formatDate(record.dueDate?.toDate()),
                status: record.status
            };
        }));

        // Header tabel
        const headers = ['No', 'Judul Buku', 'Peminjam', 'Tanggal Pinjam', 'Tanggal Jatuh Tempo', 'Status'];
        
        // Isi tabel
        const data = reportData.map((item, index) => [
            index + 1,
            item.book,
            item.borrower,
            item.borrowDate,
            item.dueDate,
            item.status
        ]);
        
        // Generate PDF
        await generatePDFReport({
            title: 'Laporan Peminjaman Buku',
            fromDate,
            toDate,
            headers,
            data,
            statusElementId: 'borrowing-report-status',
            fileNamePrefix: 'Laporan_Peminjaman',
            headColor: [41, 128, 185] // Warna biru
        });
        
    } catch (error) {
        console.error("Error generating borrowing report:", error);
        alert('Gagal membuat laporan: ' + error.message);
    }
}

// ==================== LAPORAN PENGEMBALIAN ====================
async function generateReturnReport() {
    const fromDate = document.getElementById('return-from-date').value;
    const toDate = document.getElementById('return-to-date').value;
    
    if (!fromDate || !toDate) {
        alert('Harap pilih rentang tanggal!');
        return;
    }

    try {
        // Firebase v8 syntax
        const querySnapshot = await db.collection('circulation')
            .where('status', '==', 'returned')
            .get();
        
        if (querySnapshot.empty) {
            alert('Tidak ada data pengembalian pada rentang tanggal tersebut');
            return;
        }

        // Filter data
        const filteredData = querySnapshot.docs.filter(doc => {
            const record = doc.data();
            const returnDate = record.returnDate?.toDate();
            return returnDate && 
                   returnDate >= new Date(fromDate) && 
                   returnDate <= new Date(toDate);
        });

        if (filteredData.length === 0) {
            alert('Tidak ada data pengembalian pada rentang tanggal tersebut');
            return;
        }

        const reportData = await Promise.all(filteredData.map(async (doc) => {
            const record = doc.data();
            // Firebase v8 syntax
            const [bookDoc, userDoc] = await Promise.all([
                db.collection('books').doc(record.bookId).get(),
                db.collection('users').doc(record.userId).get()
            ]);
            
            return {
                book: bookDoc.data()?.title || '-',
                borrower: userDoc.data()?.name || '-',
                borrowDate: formatDate(record.borrowDate?.toDate()),
                returnDate: formatDate(record.returnDate?.toDate())
            };
        }));

        const headers = ['No', 'Judul Buku', 'Peminjam', 'Tanggal Pinjam', 'Tanggal Kembali'];
        
        const data = reportData.map((item, index) => [
            index + 1,
            item.book,
            item.borrower,
            item.borrowDate,
            item.returnDate
        ]);
        
        await generatePDFReport({
            title: 'Laporan Pengembalian Buku',
            fromDate,
            toDate,
            headers,
            data,
            statusElementId: 'return-report-status',
            fileNamePrefix: 'Laporan_Pengembalian',
            headColor: [39, 174, 96] // Warna hijau
        });
        
    } catch (error) {
        console.error("Error generating return report:", error);
        alert('Gagal membuat laporan: ' + error.message);
    }
}

// ==================== LAPORAN SIRKULASI ====================
async function generateCirculationReport() {
    const fromDate = document.getElementById('circulation-from-date').value;
    const toDate = document.getElementById('circulation-to-date').value;
    
    if (!fromDate || !toDate) {
        alert('Harap pilih rentang tanggal!');
        return;
    }

    try {
        // Firebase v8 syntax
        const querySnapshot = await db.collection('circulation').get();
        
        if (querySnapshot.empty) {
            alert('Tidak ada data sirkulasi pada rentang tanggal tersebut');
            return;
        }

        // Filter data
        const filteredData = querySnapshot.docs.filter(doc => {
            const record = doc.data();
            const borrowDate = record.borrowDate?.toDate();
            return borrowDate && 
                   borrowDate >= new Date(fromDate) && 
                   borrowDate <= new Date(toDate);
        });

        if (filteredData.length === 0) {
            alert('Tidak ada data sirkulasi pada rentang tanggal tersebut');
            return;
        }

        const reportData = await Promise.all(filteredData.map(async (doc) => {
            const record = doc.data();
            // Firebase v8 syntax
            const [bookDoc, userDoc] = await Promise.all([
                db.collection('books').doc(record.bookId).get(),
                db.collection('users').doc(record.userId).get()
            ]);
            
            return {
                book: bookDoc.data()?.title || '-',
                borrower: userDoc.data()?.name || '-',
                borrowDate: formatDate(record.borrowDate?.toDate()),
                dueDate: formatDate(record.dueDate?.toDate()),
                returnDate: record.returnDate ? formatDate(record.returnDate?.toDate()) : '-',
                status: record.status
            };
        }));

        const headers = ['No', 'Judul Buku', 'Peminjam', 'Tanggal Pinjam', 'Jatuh Tempo', 'Tanggal Kembali', 'Status'];
        
        const data = reportData.map((item, index) => [
            index + 1,
            item.book,
            item.borrower,
            item.borrowDate,
            item.dueDate,
            item.returnDate,
            item.status
        ]);
        
        await generatePDFReport({
            title: 'Laporan Sirkulasi Buku',
            fromDate,
            toDate,
            headers,
            data,
            statusElementId: 'circulation-report-status',
            fileNamePrefix: 'Laporan_Sirkulasi',
            headColor: [142, 68, 173] // Warna ungu
        });
        
    } catch (error) {
        console.error("Error generating circulation report:", error);
        alert('Gagal membuat laporan: ' + error.message);
    }
}

// Inisialisasi event listeners saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Set tanggal default (1 bulan terakhir)
    const today = new Date().toISOString().split('T')[0];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
    
    // Set nilai default untuk semua input tanggal
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input.id.includes('from-date')) {
            input.value = oneMonthAgoStr;
        } else {
            input.value = today;
        }
    });
    
    // Event listeners untuk tombol generate
    document.getElementById('generate-borrowing-report').addEventListener('click', generateBorrowingReport);
    document.getElementById('generate-return-report').addEventListener('click', generateReturnReport);
    document.getElementById('generate-circulation-report').addEventListener('click', generateCirculationReport);
});

//LOGOUT
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
