import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    databaseURL: "https://perpustakaan-web-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.firebasestorage.app",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

//button submit
const submit = document.getElementById('submit');
submit.addEventListener("click", function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const nama = document.getElementById('name').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Simpan data admin
            return set(ref(db, 'admin/' + user.uid), {
                name: nama,
                email: email,
                role: "admin", // Tambahkan role untuk identifikasi
                createdAt: new Date().toISOString()
            });
        })
        .then(() => {
            alert("Akun admin berhasil dibuat!");
            window.location.href = "login.html";
        })
        .catch((error) => {
            let errorMessage = "Terjadi error: " + error.message;
            
            // Tambahkan penanganan error spesifik
            if (error.code === "auth/email-already-in-use") {
                errorMessage = "Email sudah terdaftar!";
            } else if (error.code === "auth/weak-password") {
                errorMessage = "Password minimal 6 karakter!";
            }
            
            alert(errorMessage);
        });
});