function toggleEmailForm() {
    const form = document.getElementById('email-form');
    form.classList.toggle('hidden');
}

function toggleUsernameForm() {
    const form = document.getElementById('username-form');
    form.classList.toggle('hidden');
}

function togglePasswordForm() {
    const form = document.getElementById('password-form');
    form.classList.toggle('hidden');
}

// Show message function (like dashboard pattern)
function showMessage(message, isError = false) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message-alert');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-alert mb-6 p-4 rounded-lg ${isError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`;
    messageDiv.innerHTML = `<p class="${isError ? 'text-red-800' : 'text-green-800'} font-medium">${message}</p>`;

    // Insert at top of profile card
    const profileCard = document.querySelector('.bg-white.rounded-lg.shadow');
    profileCard.parentNode.insertBefore(messageDiv, profileCard);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Update username display
function updateUsernameDisplay(newUsername) {
    // Find all text-gray-700 divs and look for the one containing "Username:"
    const allDivs = document.querySelectorAll('.text-gray-700');
    for (let div of allDivs) {
        if (div.textContent.includes('Username:')) {
            div.innerHTML = `<span class="font-medium">Username:</span> ${newUsername}`;
            break;
        }
    }
}

// Update email display
function updateEmailDisplay(newEmail) {
    // Find all text-gray-700 divs and look for the one containing "Email:"
    const allDivs = document.querySelectorAll('.text-gray-700');
    for (let div of allDivs) {
        if (div.textContent.includes('Email:')) {
            div.innerHTML = `<span class="font-medium">Email:</span> ${newEmail}`;
            break;
        }
    }
}

// Handle username form submission
document.getElementById('username-update-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('new-username').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Disable submit button during request
    submitBtn.disabled = true;
    submitBtn.textContent = '💾 Saving...';

    try {
        const response = await fetch('/update-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username })
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            showMessage(data.message, false);
            updateUsernameDisplay(data.username);
            toggleUsernameForm(); // Close the form
            document.getElementById('new-username').value = ''; // Clear input
        } else {
            // Error
            showMessage(data.error, true);
        }
    } catch (error) {
        console.error('Error updating username:', error);
        showMessage('An unexpected error occurred.', true);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Save';
    }
});

// Handle email form submission
document.getElementById('email-update-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('new-email').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Disable submit button during request
    submitBtn.disabled = true;
    submitBtn.textContent = '💾 Saving...';

    try {
        const response = await fetch('/update-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            showMessage(data.message, false);
            updateEmailDisplay(data.email);
            toggleEmailForm(); // Close the form
            document.getElementById('new-email').value = ''; // Clear input
        } else {
            // Error
            showMessage(data.error, true);
        }
    } catch (error) {
        console.error('Error updating email:', error);
        showMessage('An unexpected error occurred.', true);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Save';
    }
});

// Handle password form submission
document.getElementById('password-update-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Client-side validation for password match
    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match.', true);
        return;
    }
    
    // Disable submit button during request
    submitBtn.disabled = true;
    submitBtn.textContent = '💾 Saving...';

    try {
        const response = await fetch('/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                currentPassword: currentPassword,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            showMessage(data.message, false);
            togglePasswordForm(); // Close the form
            // Clear all password fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            // Error
            showMessage(data.error, true);
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showMessage('An unexpected error occurred.', true);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Save';
    }
});

function confirmDeleteAccount() {
    const confirmed = confirm(
        'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.'
    );
    
    if (confirmed) {
        const doubleConfirm = confirm(
            'This is your final warning. Deleting your account will remove all your waypoints, paths, and account data permanently. Are you absolutely sure?'
        );
        
        if (doubleConfirm) {
            deleteAccount();
        }
    }
}

// Handle account deletion
async function deleteAccount() {
    const deleteBtn = document.querySelector('button[onclick="confirmDeleteAccount()"]');
    
    // Disable delete button during request
    const originalText = deleteBtn.textContent;
    deleteBtn.disabled = true;
    deleteBtn.textContent = '🗑️ Deleting...';

    try {
        const response = await fetch('/delete-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Success - show message and redirect
            showMessage(data.message, false);
            
            // Redirect after a short delay to show the success message
            setTimeout(() => {
                window.location.href = data.redirectTo || '/login';
            }, 2000);
        } else {
            // Error
            showMessage(data.error, true);
            // Re-enable delete button on error
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showMessage('An unexpected error occurred while deleting account.', true);
        // Re-enable delete button on error
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalText;
    }
}

// Password confirmation validation
document.getElementById('confirm-password').addEventListener('input', function() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = this.value;
    
    if (newPassword !== confirmPassword) {
        this.setCustomValidity('Passwords do not match');
    } else {
        this.setCustomValidity('');
    }
});
