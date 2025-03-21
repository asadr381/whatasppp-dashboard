document.getElementById('forget-submit-button').addEventListener('click', async () => {
    const email = document.getElementById('forget-email').value;

    try {
        const response = await fetch('/forget-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (response.ok) {
            alert('A new password has been sent to your email.');
            window.location.href = 'index.html';
        } else {
            alert('Failed to reset password. Please check your email.');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Error resetting password');
    }
});
