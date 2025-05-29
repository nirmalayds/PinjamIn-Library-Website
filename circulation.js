import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    where, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { 
    getAuth,  
    signOut
  } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";


// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 


async function initializeDropdowns() {
    try {
        // Ambil data buku yang tersedia (available > 0)
        const booksQuery = query(collection(db, 'books'), where('available', '>', 0));
        const booksSnapshot = await getDocs(booksQuery);
        
        // Ambil semua data pengguna
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        // Isi dropdown buku di form tambah dan edit
        const bookSelects = [
            document.getElementById('circulation-book'),
            document.getElementById('edit-circulation-book')
        ];
        
        // Isi dropdown pengguna di form tambah dan edit
        const userSelects = [
            document.getElementById('circulation-user'),
            document.getElementById('edit-circulation-user')
        ];
        
        // Kosongkan dropdown terlebih dahulu
        bookSelects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Select a book</option>';
            }
        });
        
        userSelects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Select a user</option>';
            }
        });
        
        // Isi dropdown buku
        booksSnapshot.forEach(doc => {
            const bookData = doc.data();
            bookSelects.forEach(select => {
                if (select) {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `${bookData.title} (${bookData.author})`;
                    select.appendChild(option);
                }
            });
        });
        
        // Isi dropdown pengguna
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            userSelects.forEach(select => {
                if (select) {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `${userData.name} (${userData.email || userData.id})`;
                    select.appendChild(option);
                }
            });
        });
    } catch (error) {
        console.error("Error initializing dropdowns:", error);
        alert('Gagal memuat data buku/pengguna');
    }
}

async function addCirculation() {
    // Ambil nilai dari form
    const bookId = document.getElementById('circulation-book').value;
    const userId = document.getElementById('circulation-user').value;
    const borrowDate = document.getElementById('circulation-borrow-date').value;
    const dueDate = document.getElementById('circulation-due-date').value;
    
    // Validasi input
    if (!bookId || !userId || !borrowDate || !dueDate) {
        alert('Harap isi semua field!');
        return;
    }
    
    // Validasi tanggal
    const today = new Date();
    const borrowDateObj = new Date(borrowDate);
    const dueDateObj = new Date(dueDate);
    
    if (borrowDateObj > dueDateObj) {
        alert('Tanggal jatuh tempo tidak boleh sebelum tanggal peminjaman!');
        return;
    }
    
    try {
        // Dapatkan data buku untuk validasi stok
        const bookDoc = await getDoc(doc(db, 'books', bookId));
        if (!bookDoc.exists()) {
            alert('Buku tidak ditemukan!');
            return;
        }
        
        const bookData = bookDoc.data();
        if (bookData.available <= 0) {
            alert('Buku tidak tersedia untuk dipinjam!');
            return;
        }
        
        // Dapatkan data user
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            alert('Pengguna tidak ditemukan!');
            return;
        }
        
        // Buat record sirkulasi baru
        const circulationData = {
            bookId: bookId,
            bookTitle: bookData.title,
            bookAuthor: bookData.author,
            userId: userId,
            userName: userDoc.data().name,
            borrowDate: borrowDateObj,
            dueDate: dueDateObj,
            status: 'borrowed',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // Simpan ke Firestore
        const circulationRef = await addDoc(collection(db, 'circulation'), circulationData);
        
        // Update stok buku
        await updateDoc(doc(db, 'books', bookId), {
            available: increment(-1),
            lastBorrowed: serverTimestamp()
        });
        
        // Update history peminjaman user
        await updateDoc(doc(db, 'users', userId), {
            borrowedBooks: arrayUnion({
                bookId: bookId,
                circulationId: circulationRef.id,
                borrowDate: borrowDateObj,
                dueDate: dueDateObj
            }),
            lastActivity: serverTimestamp()
        });
        
        // Tampilkan pesan sukses
        alert('Data sirkulasi berhasil ditambahkan!');
        
        // Reset form dan tutup modal
        document.getElementById('add-circulation-form').reset();
        document.getElementById('add-circulation-modal').style.display = 'none';
        
        // Refresh data tabel
        loadCirculation();
        loadBorrowedBooks();
    } catch (error) {
        console.error("Error adding circulation:", error);
        alert('Gagal menambahkan data sirkulasi: ' + error.message);
    }
}

async function loadCirculation() {
    const table = document.getElementById('circulation-table');
    // Simpan header tabel
    const headerRow = '<tr><th>Book</th><th>User</th><th>Borrow Date</th><th>Due Date</th><th>Return Date</th><th>Status</th><th>Actions</th></tr>';
    table.innerHTML = headerRow;
    
    try {
        // Ambil semua data sirkulasi diurutkan berdasarkan tanggal peminjaman terbaru
        const q = query(
            collection(db, 'circulation'), 
            orderBy('borrowDate', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            table.innerHTML += '<tr><td colspan="7">No circulation records found</td></tr>';
            return;
        }
        
        // Proses setiap dokumen
        querySnapshot.forEach(doc => {
            const record = doc.data();
            
            // Format tanggal
            const borrowDate = formatDate(record.borrowDate);
            const dueDate = formatDate(record.dueDate);
            const returnDate = record.returnDate ? formatDate(record.returnDate) : '-';
            
            // Tentukan class status untuk styling
            const statusClass = `status-${record.status.toLowerCase()}`;
            
            // Buat row tabel
            const row = `
                <tr>
                    <td>${record.bookTitle} by ${record.bookAuthor}</td>
                    <td>${record.userName}</td>
                    <td>${borrowDate}</td>
                    <td>${dueDate}</td>
                    <td>${returnDate}</td>
                    <td class="${statusClass}">${record.status}</td>
                    <td>
                        <button class="btn-edit" onclick="editCirculation('${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteCirculation('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
            
            table.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading circulation:", error);
        table.innerHTML += '<tr><td colspan="7" class="error">Failed to load circulation data</td></tr>';
    }
}

function formatDate(date) {
    if (!date) return '-';
    
    try {
        // Jika date adalah Timestamp Firebase, konversi ke Date object
        const jsDate = date.toDate ? date.toDate() : new Date(date);
        
        // Format ke string lokal Indonesia
        return jsDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
}

//Edit & Update Circulation
window.editCirculation = editCirculation;
window.deleteCirculation = deleteCirculation;
window.updateCirculation =  updateCirculation;
window.confirmReturn = confirmReturn;

// Perbaikan fungsi editCirculation
async function editCirculation(circulationId) {
    try {
        const docSnap = await getDoc(doc(db, 'circulation', circulationId));
        if (!docSnap.exists()) {
            alert('Circulation record not found');
            return;
        }
        
        const record = docSnap.data();
        
        // Isi form edit
        document.getElementById('edit-circulation-id').value = circulationId;
        
        // Set nilai dropdown buku
        const bookSelect = document.getElementById('edit-circulation-book');
        bookSelect.innerHTML = `<option value="${record.bookId}">${record.bookTitle} by ${record.bookAuthor}</option>`;
        
        // Set nilai dropdown user
        const userSelect = document.getElementById('edit-circulation-user');
        userSelect.innerHTML = `<option value="${record.userId}">${record.userName}</option>`;
        
        // Format tanggal untuk input date (YYYY-MM-DD)
        const borrowDate = record.borrowDate.toDate().toISOString().split('T')[0];
        const dueDate = record.dueDate.toDate().toISOString().split('T')[0];
        
        document.getElementById('edit-circulation-borrow-date').value = borrowDate;
        document.getElementById('edit-circulation-due-date').value = dueDate;
        document.getElementById('edit-circulation-status').value = record.status;
        
        // Tampilkan modal
        document.getElementById('edit-circulation-modal').style.display = 'block';
    } catch (error) {
        console.error("Error getting circulation:", error);
        alert('Failed to load circulation data for editing');
    }
}

//  fungsi updateCirculation
async function updateCirculation() {
    const circulationId = document.getElementById('edit-circulation-id').value;
    const status = document.getElementById('edit-circulation-status').value;
    
    if (!circulationId) {
        alert('Invalid circulation ID');
        return;
    }
    
    try {
        const updateData = {
            status: status,
            updatedAt: serverTimestamp()
        };
        
        // Jika status diubah menjadi returned, set returnDate
        if (status === 'returned') {
            updateData.returnDate = serverTimestamp();
            
            // Dapatkan data sirkulasi untuk update stok buku
            const docSnap = await getDoc(doc(db, 'circulation', circulationId));
            if (docSnap.exists()) {
                const record = docSnap.data();
                const currentDate = new Date();
                
                // Tambah stok buku yang tersedia
                await updateDoc(doc(db, 'books', record.bookId), {
                    available: increment(1),
                    lastReturned: serverTimestamp()
                });
                
                // Update history user
                const newReturnEntry = {
                    bookId: record.bookId,
                    circulationId: circulationId,
                    returnDate: currentDate // Gunakan timestamp klien dulu
                };
                
                await updateDoc(doc(db, 'users', record.userId), {
                    returnedBooks: arrayUnion(newReturnEntry),
                    lastActivity: serverTimestamp()
                });
            }
        }
        
        // Update data di Firestore
        await updateDoc(doc(db, 'circulation', circulationId), updateData);
        
        alert('Circulation record updated successfully!');
        
        // Tutup modal dan refresh data
        document.getElementById('edit-circulation-modal').style.display = 'none';
        loadCirculation();
        loadBorrowedBooks();
        loadReturnedBooks();
    } catch (error) {
        console.error("Error updating circulation:", error);
        alert('Failed to update circulation record: ' + error.message);
    }
}

// Perbaikan fungsi onload
window.onload = function() {
    // Load data awal
    loadCirculation();
    loadBorrowedBooks();
    loadReturnedBooks();
    
    // Inisialisasi dropdown
    initializeDropdowns();
    
    // Setup event listener untuk form tambah sirkulasi
    const addForm = document.getElementById('add-circulation-form');
    if (addForm) {
        addForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addCirculation();
        });
    }
    
    // Setup event listener untuk form edit sirkulasi
    const editForm = document.getElementById('edit-circulation-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateCirculation();
        });
    }
};

async function deleteCirculation(circulationId) {
    if (!confirm('Are you sure you want to delete this circulation record?')) {
        return;
    }
    
    try {
        // Dapatkan data sirkulasi terlebih dahulu
        const docSnap = await getDoc(doc(db, 'circulation', circulationId));
        if (!docSnap.exists()) {
            alert('Circulation record not found');
            return;
        }
        
        const record = docSnap.data();
        
        // Jika status borrowed, kembalikan stok buku
        if (record.status === 'borrowed') {
            await updateDoc(doc(db, 'books', record.bookId), {
                available: increment(1),
                updatedAt: serverTimestamp()
            });
            
            // Hapus dari history peminjaman user
            await updateDoc(doc(db, 'users', record.userId), {
                borrowedBooks: arrayRemove({
                    bookId: record.bookId,
                    circulationId: circulationId
                }),
                lastActivity: serverTimestamp()
            });
        }
        
        // Hapus record sirkulasi
        await deleteDoc(doc(db, 'circulation', circulationId));
        
        alert('Circulation record deleted successfully!');
        
        // Refresh data
        loadCirculation();
        loadBorrowedBooks();
        loadReturnedBooks();
    } catch (error) {
        console.error("Error deleting circulation:", error);
        alert('Failed to delete circulation record');
    }
}

async function loadBorrowedBooks() {
    const table = document.getElementById('borrowed-books-table');
    table.innerHTML = '<tr><th>Book</th><th>Borrower</th><th>Borrow Date</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>';
    
    try {
        // Ambil data dengan status borrowed
        const q = query(
            collection(db, 'circulation'), 
            where('status', '==', 'borrowed'),
            orderBy('dueDate', 'asc') // Urutkan berdasarkan due date terdekat
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            table.innerHTML += '<tr><td colspan="6">No borrowed books found</td></tr>';
            return;
        }
        
        querySnapshot.forEach(doc => {
            const record = doc.data();
            const borrowDate = formatDate(record.borrowDate);
            const dueDate = formatDate(record.dueDate);
            
            // Cek apakah sudah lewat due date
            const isOverdue = new Date() > record.dueDate.toDate();
            const statusClass = isOverdue ? 'status-overdue' : 'status-borrowed';
            const statusText = isOverdue ? 'Overdue' : 'Borrowed';
            
            const row = `
                <tr>
                    <td>${record.bookTitle}</td>
                    <td>${record.userName}</td>
                    <td>${borrowDate}</td>
                    <td>${dueDate}</td>
                    <td class="${statusClass}">${statusText}</td>
                    <td>
                        <button class="btn-return" onclick="confirmReturn('${doc.id}')">Confirm Return</button>
                    </td>
                </tr>
            `;
            
            table.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading borrowed books:", error);
        table.innerHTML += '<tr><td colspan="6" class="error">Failed to load borrowed books</td></tr>';
    }
}

async function loadReturnedBooks() {
    const table = document.getElementById('returned-books-table');
    table.innerHTML = '<tr><th>Book</th><th>Borrower</th><th>Borrow Date</th><th>Return Date</th><th>Status</th></tr>';
    
    try {
        // Ambil data dengan status returned
        const q = query(
            collection(db, 'circulation'), 
            where('status', '==', 'returned'),
            orderBy('returnDate', 'desc') // Urutkan berdasarkan return date terbaru
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            table.innerHTML += '<tr><td colspan="5">No returned books found</td></tr>';
            return;
        }
        
        querySnapshot.forEach(doc => {
            const record = doc.data();
            const borrowDate = formatDate(record.borrowDate);
            const returnDate = formatDate(record.returnDate);
            
            const row = `
                <tr>
                    <td>${record.bookTitle}</td>
                    <td>${record.userName}</td>
                    <td>${borrowDate}</td>
                    <td>${returnDate}</td>
                    <td class="status-returned">Returned</td>
                </tr>
            `;
            
            table.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading returned books:", error);
        table.innerHTML += '<tr><td colspan="5" class="error">Failed to load returned books</td></tr>';
    }
}

async function confirmReturn(circulationId) {
    if (!confirm('Confirm return of this book?')) {
        return;
    }
    
    try {
        // Dapatkan data sirkulasi terlebih dahulu
        const docSnap = await getDoc(doc(db, 'circulation', circulationId));
        if (!docSnap.exists()) {
            alert('Circulation record not found');
            return;
        }
        
        const record = docSnap.data();
        
        // Update status menjadi returned dan set returnDate
        await updateDoc(doc(db, 'circulation', circulationId), {
            status: 'returned',
            returnDate: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        // Tambah stok buku yang tersedia
        await updateDoc(doc(db, 'books', record.bookId), {
            available: increment(1),
            lastReturned: serverTimestamp()
        });
        
        // Update history user
        await updateDoc(doc(db, 'users', record.userId), {
            returnedBooks: arrayUnion({
                bookId: record.bookId,
                circulationId: circulationId,
                returnDate: serverTimestamp()
            }),
            lastActivity: serverTimestamp()
        });
        
        alert('Book return confirmed successfully!');
        
        // Refresh data
        loadCirculation();
        loadBorrowedBooks();
        loadReturnedBooks();
    } catch (error) {
        console.error("Error confirming return:", error);
        alert('Failed to confirm return');
    }
}

// Inisialisasi saat halaman dimuat
window.onload = function() {
    // Load data awal
    loadCirculation();
    loadBorrowedBooks();
    loadReturnedBooks();
    
    // Inisialisasi dropdown
    initializeDropdowns();
    
    // Setup event listener untuk form tambah sirkulasi
    document.getElementById('add-circulation-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addCirculation();
    });
};

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
