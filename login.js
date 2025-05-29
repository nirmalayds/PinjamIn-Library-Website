import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.firebasestorage.app",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const submit = document.getElementById('submit');
submit.addEventListener("click", function(event) {
    event.preventDefault();

    // Inputs
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Show loading indicator
    Swal.fire({
        title: 'Memproses login...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("Login UID:", user.uid);
            
            // Success notification
            Swal.fire({
                title: 'Login Berhasil!',
                text: 'Anda akan diarahkan ke dashboard',
                icon: 'success',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                willClose: () => {
                    window.location.href = "dashboard.html";
                }
            });
        })
        .catch((error) => {
            let errorMessage;
            
            // Custom error messages
            switch(error.code) {
                case "auth/invalid-email":
                    errorMessage = "Format email tidak valid";
                    break;
                case "auth/user-not-found":
                    errorMessage = "Email tidak terdaftar";
                    break;
                case "auth/wrong-password":
                    errorMessage = "Password salah";
                    break;
                case "auth/too-many-requests":
                    errorMessage = "Terlalu banyak percobaan gagal. Coba lagi nanti";
                    break;
                default:
                    errorMessage = "Login gagal. Silakan coba lagi dengan email dan password yang benar!";
            }

            // Error notification
            Swal.fire({
                title: 'Gagal Login',
                text: errorMessage,
                icon: 'error',
                showCloseButton: true,
                confirmButtonText: 'Mengerti',
                confirmButtonColor: '#3085d6'
            });
        });
});



