import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
// Ganti import database dengan firestore
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    databaseURL: "https://perpustakaan-web-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com",
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Pastikan DOM sudah siap
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("auth-form");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById('nd').value.trim();
        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password')?.value;

        if (confirmPassword && password !== confirmPassword) {
            alert("Konfirmasi password tidak cocok!");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                name,
                username,
                email,
                phoneNumber: phone,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            alert("Akun berhasil dibuat!");
            window.location.href = "login-user.html";
        } catch (error) {
            let errorMessage = "Terjadi error: " + error.message;
            if (error.code === "auth/email-already-in-use") {
                errorMessage = "Email sudah terdaftar!";
            } else if (error.code === "auth/weak-password") {
                errorMessage = "Password minimal 6 karakter!";
            } else if (error.code === "auth/invalid-email") {
                errorMessage = "Format email tidak valid!";
            }
            alert(errorMessage);
        }
    });
});