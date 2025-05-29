import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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

let selectedFile = null; 
let storage;

//Melihat buku
async function loadBooks(db) {
  const booksTable = document.getElementById('books-table');
  booksTable.innerHTML = `
    <tr>
      <th>Cover</th>
      <th>Title</th>
      <th>Author</th>
      <th>ISBN</th>
      <th>Quantity</th>
      <th>Available</th>
      <th>Description</th>
      <th>Actions</th>
    </tr>
  `;

  try {
    const querySnapshot = await getDocs(collection(db, 'books'));
    const fragment = document.createDocumentFragment();

    querySnapshot.forEach((doc) => {
      const book = doc.data();
      const row = document.createElement('tr');

      // Kolom Cover (gambar)
      const coverCell = document.createElement('td');
      if (book.coverUrl) {
        const img = document.createElement('img');
        img.src = book.coverUrl;
        img.alt = book.title;
        img.style.maxWidth = '50px';
        img.style.maxHeight = '50px';
        coverCell.appendChild(img);
      } else {
        coverCell.textContent = 'No Cover';
      }

      // Kolom Description dengan tooltip
      const descCell = document.createElement('td');
      descCell.textContent = book.description 
        ? book.description.substring(0, 30) + (book.description.length > 30 ? '...' : '')
        : '-';
      descCell.title = book.description || ''; // Tooltip untuk deskripsi lengkap

      row.innerHTML = `
        <td></td>
        <td>${book.title || '-'}</td>
        <td>${book.author || '-'}</td>
        <td>${book.isbn || '-'}</td>
        <td>${book.quantity || 0}</td>
        <td>${book.available || 0}</td>
        <td></td>
        <td class="action-buttons">
          <button class="edit-btn" data-id="${doc.id}">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="delete-btn" data-id="${doc.id}">
            <i class="fas fa-trash-alt"></i> Delete
          </button>
        </td>
      `;
      // Tambahkan elemen gambar dan deskripsi
      row.children[0].replaceWith(coverCell);
      row.children[6].replaceWith(descCell);

      fragment.appendChild(row);
    });

    booksTable.appendChild(fragment);
    
    // Tambahkan event listeners untuk tombol
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editBook(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteBook(btn.dataset.id));
    });

  } catch (error) {
    console.error("Error loading books: ", error);
    booksTable.innerHTML = `
      <tr>
        <td colspan="6" class="error">Failed to load books. Please try again.</td>
      </tr>
    `;
  }
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadBooks(db); //  Panggil setelah deklarasi
  } catch (error) {
    console.error("Initialization error:", error);
  }
});


//Mencari data buku
// Search input
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('book-search');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Search on button click
  searchBtn.addEventListener('click', searchBooks);

  // Search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBooks();
    }
  });

  // Reset with debounce
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    loadBooks(db);
  });

  // Optional: Debounce for search input
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(searchBooks, 300);
  });
});

async function searchBooks() {
  const searchTerm = document.getElementById('book-search').value.toLowerCase();
  const booksTable = document.getElementById('books-table');
  booksTable.innerHTML = `
    <tr>
      <th>Cover</th>
      <th>Title</th>
      <th>Author</th>
      <th>ISBN</th>
      <th>Quantity</th>
      <th>Available</th>
      <th>Description</th>
      <th>Actions</th>
    </tr>
  `;

  try {
    const querySnapshot = await getDocs(collection(db, 'books'));
    const fragment = document.createDocumentFragment();

    querySnapshot.forEach((doc) => {
      const book = doc.data();
      const matchesSearch =
        (book.title && book.title.toLowerCase().includes(searchTerm)) ||
        (book.author && book.author.toLowerCase().includes(searchTerm)) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchTerm));

      if (matchesSearch) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td></td>
          <td>${book.title || '-'}</td>
          <td>${book.author || '-'}</td>
          <td>${book.isbn || '-'}</td>
          <td>${book.quantity || 0}</td>
          <td>${book.available || 0}</td>
          <td></td>
          <td class="action-buttons">
            <button class="edit-btn" onclick="editBook('${doc.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteBook('${doc.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        `;
        fragment.appendChild(row);
      }
    });

    booksTable.appendChild(fragment);
  } catch (error) {
    console.error("Error searching books: ", error);
    alert("Failed to search books: " + error.message);
  }
}

//Menambah data buku    
document.getElementById('submit').addEventListener('click', function(e) {
  e.preventDefault();
  addBook();
});

document.getElementById('book-cover').addEventListener('change', function(e) {
  selectedFile = e.target.files[0]; // Simpan file yang dipilih
  
  // Tampilkan preview gambar
  if (selectedFile) {
    const preview = document.getElementById('preview-img');
    preview.src = URL.createObjectURL(selectedFile);
    document.getElementById('image-preview').style.display = 'block';
  }
});

// Fungsi untuk menangani upload gambar
async function uploadImage(file) {
  if (!file) return null;
  
  try {
    const storageRef = ref(storage, `book-covers/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

async function addBook() {
  const title = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const isbn = document.getElementById('book-isbn').value.trim();
  const quantity = parseInt(document.getElementById('book-quantity').value) || 0;
  const description = document.getElementById('book-desc').value.trim();

  // Validasi input
  if (!title || !author || !isbn || quantity <= 0 || !description) {
    alert("Please fill all fields correctly!");
    return;
  }

  try {
    // Show loading indicator while uploading
    const loadingAlert = Swal.fire({
        title: 'Menambahkan buku...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Upload gambar
    const imageUrl = selectedFile ? await uploadImage(selectedFile) : null;

    await addDoc(collection(db, 'books'), {
        title: title,
        author: author,
        isbn: isbn,
        quantity: quantity,
        available: quantity,
        description: description,
        coverUrl: imageUrl || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // Close loading alert
    await loadingAlert.close();

    // Success notification with animation
    await Swal.fire({
        title: 'Sukses!',
        text: 'Buku berhasil ditambahkan',
        icon: 'success',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: '#f8f9fa',
        showClass: {
            popup: 'animate__animated animate__bounceIn'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOut'
        }
    });

    resetForm();
    closeModal();
    await loadBooks(db);

} catch (error) {
    console.error("Error adding book: ", error);
    
    // Error notification
    await Swal.fire({
        title: 'Gagal!',
        html: `
            <div style="text-align:center;">
                <p>Gagal menambahkan buku</p>
                <p style="font-size:14px;color:#777;">${error.message}</p>
            </div>
        `,
        icon: 'error',
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#3085d6',
        background: '#f8f9fa',
        showClass: {
            popup: 'animate__animated animate__headShake'
        }
    });
}
}

// Fungsi untuk menutup modal
function closeModal() {
  document.getElementById('add-book-modal').style.display = 'none';
}

// Fungsi untuk reset form
function resetForm() {
  document.getElementById('add-book-form').reset();
  document.getElementById('image-preview').style.display = 'none';
  selectedFile = null; // Reset variabel file
}

//Mengedit buku
document.getElementById('edit-book-form').addEventListener('submit', (e) => {
  e.preventDefault();
  updateBook();
});
let currentEditingBookId = null;
let currentEditingBookImage = null;

async function editBook(bookId) {
  try {
    const docRef = doc(db, 'books', bookId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const book = docSnap.data();
      currentEditingBookId = bookId;
      currentEditingBookImage = book.coverUrl || null;

      document.getElementById('edit-book-title').value = book.title || '';
      document.getElementById('edit-book-author').value = book.author || '';
      document.getElementById('edit-book-isbn').value = book.isbn || '';
      document.getElementById('edit-book-quantity').value = book.quantity || 0;
      document.getElementById('edit-book-desc').value = book.description || '';

      // Tampilkan preview gambar
      const preview = document.getElementById('edit-preview-img');
      const previewContainer = document.getElementById('edit-image-preview');
      if (book.coverUrl) {
        preview.src = book.coverUrl;
        previewContainer.style.display = 'block';
      } else {
        previewContainer.style.display = 'none';
      }

      document.getElementById('edit-book-modal').style.display = 'block';
    }
  } catch (error) {
    console.error("Error getting book: ", error);
    alert("Failed to get book data: " + error.message);
  }
}

// Event listener untuk upload gambar di form edit
document.getElementById('edit-book-cover').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const preview = document.getElementById('edit-preview-img');
    const reader = new FileReader();
    
    reader.onload = function(e) {
      preview.src = e.target.result;
      document.getElementById('edit-image-preview').style.display = 'block';
    }
    
    reader.readAsDataURL(file);
  }
});

async function updateBook() {
    const title = document.getElementById('edit-book-title').value.trim();
    const author = document.getElementById('edit-book-author').value.trim();
    const isbn = document.getElementById('edit-book-isbn').value.trim();
    const quantity = parseInt(document.getElementById('edit-book-quantity').value) || 0;
    const description = document.getElementById('edit-book-desc').value.trim();
    const newImageFile = document.getElementById('edit-book-cover').files[0];

    // Validasi input dengan notifikasi yang lebih baik
    if (!currentEditingBookId || !title || !author || !isbn || quantity <= 0 || !description) {
        await Swal.fire({
            icon: 'warning',
            title: 'Data Tidak Lengkap',
            text: 'Harap isi semua kolom dengan benar!',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Mengerti'
        });
        return;
    }
  
    try {
        // Tampilkan loading saat proses update
        const loadingAlert = Swal.fire({
            title: 'Memperbarui Buku...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        let imageUrl = currentEditingBookImage;
        
        // Jika ada gambar baru, upload
        if (newImageFile) {
            imageUrl = await uploadImage(newImageFile);
        }
    
        const bookRef = doc(db, 'books', currentEditingBookId);
        
        await updateDoc(bookRef, {
            title: title,
            author: author,
            isbn: isbn,
            quantity: quantity,
            description: description,
            coverUrl: imageUrl || '',
            updatedAt: serverTimestamp()
        });

        // Tutup loading
        await loadingAlert.close();

        // Notifikasi sukses
        await Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            html: `
                <div style="text-align:center;">
                    <p><strong>${title}</strong> berhasil diperbarui</p>
                    <p style="font-size:14px;color:#777;">${author} - ${isbn}</p>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonColor: '#4CAF50',
            confirmButtonText: 'OK'
        });

        // Tutup modal dan refresh data
        document.getElementById('edit-book-modal').style.display = 'none';
        await loadBooks(db);
        
    } catch (error) {
        console.error("Error updating book: ", error);
        
        // Notifikasi error
        await Swal.fire({
            icon: 'error',
            title: 'Gagal Memperbarui',
            html: `
                <div style="text-align:center;">
                    <p>Terjadi kesalahan saat memperbarui buku</p>
                    <p style="font-size:14px;color:#777;">${error.message}</p>
                </div>
            `,
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Mengerti'
        });
    }
}

//Menghapus data buku
async function deleteBook(bookId) {
  // Confirmation dialog with warning icon
  const result = await Swal.fire({
    title: 'Hapus Buku?',
    text: "Anda tidak dapat mengembalikan data yang telah dihapus!",
    icon: 'warning',
    showCloseButton: true, 
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
    reverseButtons: true,
    backdrop: `
      rgba(0,0,0,0.4)
      url("/images/fire.gif")
      left top
      no-repeat
    `,
    showClass: {
      popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    }
  });

  if (!result.isConfirmed) return;

  try {
    // Show loading indicator
    Swal.fire({
      title: 'Menghapus...',
      text: 'Sedang menghapus buku',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    await deleteDoc(doc(db, 'books', bookId));

    // Success notification
    await Swal.fire({
      title: 'Terhapus!',
      text: 'Buku berhasil dihapus',
      icon: 'success',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
      willClose: () => {
        loadBooks(db);
      }
    });

  } catch (error) {
    console.error("Error deleting book: ", error);
    
    // Error notification
    await Swal.fire({
      title: 'Gagal!',
      html: `
        <div style="text-align:center;">
          <p>Gagal menghapus buku</p>
          <p style="font-size:14px;color:#777;">${error.message}</p>
        </div>
      `,
      icon: 'error',
      confirmButtonText: 'Mengerti',
      confirmButtonColor: '#3085d6'
    });
  }
}


// Logout 
document.getElementById('logout').addEventListener("click", (e) => {
    e.preventDefault();

    Swal.fire({
        title: 'Yakin ingin logout?',
        text: "Anda akan keluar dan kembali ke halaman login.",
        icon: 'warning',
        showCancelButton: true,
        showCloseButton: true, 
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
