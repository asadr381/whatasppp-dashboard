document.getElementById('reset-submit-button').addEventListener('click', async () => {
    const email = document.getElementById('reset-email').value;
    const oldPassword = document.getElementById('reset-old-password').value;
    const newPassword = document.getElementById('reset-new-password').value;

    try {
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, oldPassword, newPassword }),
        });

        if (response.ok) {
            alert('Password reset successfully');
            window.location.href = 'index.html';
        } else {
            alert('Failed to reset password');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Error resetting password');
    }
});
