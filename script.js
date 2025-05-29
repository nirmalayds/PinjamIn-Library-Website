import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Fungsi untuk redirect ke halaman login
document.getElementById('login-btn')?.addEventListener('click', () => {
    window.location.href = 'login-user.html';
});

// Fungsi logout
document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout gagal: ' + error.message);
    }
});

function initEventListeners() {
    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            // Toggle class 'active' pada navLinks
            navLinks.classList.toggle('active');
            // Ganti icon antara bars dan times
            const icon = hamburger.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Panggil fungsi init
initEventListeners();

document.addEventListener('DOMContentLoaded', function() {
    const pinjamBtn = document.getElementById('pinjam-btn');
    
    pinjamBtn.addEventListener('click', function() {
        // Dapatkan elemen katalog
        const catalogSection = document.getElementById('catalog');
        
        // Scroll ke section katalog dengan efek smooth
        catalogSection.scrollIntoView({ behavior: 'smooth' });
    });
});

document.querySelectorAll('.read-btn').forEach(button => {
    button.addEventListener('click', function() {
        window.location.href = 'login-user.html';
    });
});

//Eye Icon
document.addEventListener('DOMContentLoaded', function() {
    const descriptions = {
        "Laut Bercerita": "Novel tentang perjuangan aktivis reformasi di Indonesia yang diceritakan dari sudut pandang tokoh Laut.",
        "Mudahnya Belajar Bahasa Inggris": "Panduan praktis untuk belajar bahasa Inggris dengan mudah dan menyenangkan.",
        "Belajar Pemrograman PHP": "Buku pemrograman PHP dengan framework CodeIgniter 4 yang cocok untuk pemula.",
        "Teruslah Bodoh Jangan Pintar": "Kumpulan pemikiran reflektif yang menantang pandangan konvensional tentang kecerdasan.",
        "Filosofi Teras": "Buku pengantar stoisisme modern untuk menghadapi kehidupan sehari-hari dengan tenang.",
        "Pemrograman Java Komplet": "Panduan lengkap untuk mempelajari Java, dari dasar hingga lanjutan.",
        "Hujan": "Kisah fiksi ilmiah dan romansa yang emosional dari Tere Liye.",
        "IOT": "Buku Fundamental IoT yang mencakup Konsep, Teknologi dan Aplikasi akan membahas mengenai sejarah dan perkembangan IoT serta beberapa contoh aplikasi dalam kehidupan sehari-hari."
    };

    window.openModal = function(title) {
        document.getElementById("modal-title").innerText = title;
        document.getElementById("modal-desc").innerText = descriptions[title] || "Deskripsi tidak tersedia.";
        document.getElementById("descModal").style.display = "flex";
    };

    window.closeModal = function() {
        document.getElementById("descModal").style.display = "none";
    };

    window.onclick = function(event) {
        const modal = document.getElementById("descModal");
        if (event.target === modal) {
            closeModal();
        }
    };
});


// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            document.querySelector('.nav-links').classList.remove('active');
        }
    });
});

// Active Link Highlighting
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links ul li a');

window.addEventListener('scroll', function() {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (pageYOffset >= (sectionTop - 100)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Category Filter
const filterButtons = document.querySelectorAll('.category-filter button');
const bookCards = document.querySelectorAll('.book-card');

filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        const filterValue = this.textContent.toLowerCase();
        
        // Filter books
        bookCards.forEach(card => {
            if (filterValue === 'semua') {
                card.style.display = 'block';
            } else {
                // In a real app, you would check the book's category
                // For demo, we'll just show all cards
                card.style.display = 'block';
            }
        });
    });
});

// Search Functionality
document.addEventListener('DOMContentLoaded', function() {
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
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });

    // Reset saat input dikosongkan
    searchInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            hideNotFoundMessage();
            document.querySelectorAll('.book-card').forEach(card => {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease';
            });
        }
    });
});

// Tambahkan CSS animasi
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .book-card {
        animation: fadeIn 0.3s ease;
    }
`;
document.head.appendChild(style);