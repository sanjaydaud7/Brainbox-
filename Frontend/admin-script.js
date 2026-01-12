document.addEventListener('DOMContentLoaded', function() {
            console.log('🧠 MindSpace Admin Dashboard - Initializing...');

            // ==================== CONFIGURATION ====================
            const API_BASE_URL = 'http://localhost:5001/api/admin';
            const token = localStorage.getItem('adminToken');

            // Redirect if no token
            if (!token) {
                console.log('❌ No auth token - redirecting to login');
                window.location.href = 'adminlogin.html';
                return;
            }

            // ==================== USER DATA ====================
            const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
            const firstName = userInfo.firstName || 'Admin';
            const lastName = userInfo.lastName || 'User';
            const fullName = userInfo.fullName || `${firstName} ${lastName}`.trim();
            const role = userInfo.role || 'admin';
            const email = userInfo.email || '';
            const mobile = userInfo.mobile || '';
            const profilePicture = userInfo.profilePicture || '';
            const initials = (firstName.charAt(0) + (lastName ? lastName.charAt(0) : '')).toUpperCase() || 'A';

            console.log('👤 User loaded:', { fullName, role, email, profilePicture: profilePicture ? 'Yes' : 'No' });

            // Role-based access control variables
            const isAdmin = role.toLowerCase() === 'admin';
            const isProfessional = ['counselor', 'therapist'].includes(role.toLowerCase());
            console.log('🔐 Access level:', { isAdmin, isProfessional });

            // Update UI with user info including profile picture
            function updateUserUI() {
                const nameEl = document.querySelector('.user-name');
                const avatarEl = document.querySelector('.user-avatar');
                const roleEl = document.querySelector('.user-role');

                if (nameEl) nameEl.textContent = fullName;
                if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);

                // Update avatar with profile picture or initials
                updateAvatarDisplay(avatarEl, profilePicture, initials);
            }

            // Helper function to update avatar display
            function updateAvatarDisplay(avatarElement, pictureUrl, fallbackInitials) {
                if (!avatarElement) return;

                if (pictureUrl && pictureUrl.trim()) {
                    // Show profile picture
                    avatarElement.style.backgroundImage = `url(${pictureUrl})`;
                    avatarElement.style.backgroundSize = 'cover';
                    avatarElement.style.backgroundPosition = 'center';
                    avatarElement.style.color = 'transparent';
                    avatarElement.textContent = '';
                    console.log('🖼️ Profile picture loaded for avatar');
                } else {
                    // Show initials
                    avatarElement.style.backgroundImage = 'none';
                    avatarElement.style.color = 'white';
                    avatarElement.textContent = fallbackInitials;
                    console.log('🔤 Using initials for avatar:', fallbackInitials);
                }
            }

            // ==================== UTILITY FUNCTIONS ====================

            // Safe DOM access
            function $(selector) { return document.querySelector(selector); }

            function $$(selector) { return document.querySelectorAll(selector); }

            function byId(id) { return document.getElementById(id); }

            // Safe event binding
            function on(element, event, handler) {
                if (element && typeof handler === 'function') {
                    element.addEventListener(event, handler);
                    return true;
                }
                return false;
            }

            // API wrapper with error handling
            async function api(endpoint, options = {}) {
                try {
                    const isFormData = options.body instanceof FormData;
                    const headers = {
                        'Authorization': `Bearer ${token}`
                    };
                    if (!isFormData) {
                        headers['Content-Type'] = 'application/json';
                    }

                    const config = {
                        headers,
                        ...options
                    };

                    // Determine the correct base URL based on endpoint
                    let baseUrl = API_BASE_URL;
                    if (endpoint.startsWith('/appointments')) {
                        baseUrl = 'http://localhost:5001/api';
                    }

                    console.log(`🌐 ${config.method || 'GET'} ${baseUrl}${endpoint}`, config.body ? 'with data' : 'no data');

                    const response = await fetch(`${baseUrl}${endpoint}`, config);
                    const contentType = response.headers.get('content-type');

                    // Check for HTML error pages
                    if (!contentType || !contentType.includes('application/json')) {
                        const htmlError = await response.text();
                        console.error('🚨 HTML Response (404/500):', htmlError.substring(0, 200));
                        throw new Error(`Server Error: ${response.status} - Check if backend is running`);
                    }

                    const data = await response.json();
                    console.log(`📡 ${response.status}:`, data);

                    if (!response.ok) {
                        throw new Error(data.message || `HTTP ${response.status}`);
                    }

                    return data;
                } catch (error) {
                    console.error(`💥 API Error [${endpoint}]:`, error);

                    // User-friendly notifications
                    if (error.message.includes('404')) {
                        notify('Backend not found! Check if server is running on port 5001', 'error');
                    } else if (error.message.includes('Network')) {
                        notify('Network error - Check your connection', 'error');
                    } else if (error.message.includes('401')) {
                        notify('Session expired - Please login again', 'warning');
                        localStorage.removeItem('adminToken');
                        setTimeout(() => window.location.href = 'adminlogin.html', 2000);
                    } else {
                        notify(`Request failed: ${error.message}`, 'error');
                    }

                    throw error;
                }
            }

            // Notification system
            function notify(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.textContent = message;

                // Dynamic styles
                const styles = {
                    info: { bg: '#2196f3', border: '#1976d2' },
                    success: { bg: '#4caf50', border: '#388e3c' },
                    warning: { bg: '#ff9800', border: '#f57c00' },
                    error: { bg: '#f44336', border: '#d32f2f' }
                };

                const currentStyle = styles[type] || styles.info;

                Object.assign(notification.style, {
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: currentStyle.bg,
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: '10000',
                    maxWidth: '350px',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '14px',
                    borderLeft: `4px solid ${currentStyle.border}`,
                    opacity: '0',
                    transform: 'translateX(100%)',
                    transition: 'all 0.3s ease'
                });

                document.body.appendChild(notification);

                // Animate in
                requestAnimationFrame(() => {
                    notification.style.opacity = '1';
                    notification.style.transform = 'translateX(0)';
                });

                // Auto remove
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, 4000);
            }

            // Show field errors
            function showFieldError(fieldId, message) {
                const errorEl = byId(fieldId);
                if (!errorEl) return;

                errorEl.textContent = message;
                errorEl.style.display = 'block';
                Object.assign(errorEl.style, {
                    color: '#f44336',
                    fontSize: '13px',
                    marginTop: '5px',
                    fontWeight: '500',
                    background: '#ffebee',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    borderLeft: '3px solid #f44336'
                });

                // Scroll to error
                errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Clear form errors
            function clearErrors(formId) {
                const form = byId(formId);
                if (!form) return;

                form.querySelectorAll('.error-message').forEach(el => {
                    el.style.display = 'none';
                    el.textContent = '';
                    el.style.background = 'transparent';
                    el.style.padding = '0';
                    el.style.borderLeft = 'none';
                });
            }

            // Show success message
            function showSuccess(formId, message, type = 'success') {
                const successEl = byId(formId) || formId;
                let targetEl;

                if (typeof successEl === 'string') {
                    targetEl = byId(successEl);
                } else {
                    targetEl = successEl;
                }

                if (!targetEl) return;

                targetEl.textContent = message;
                targetEl.style.display = 'block';
                Object.assign(targetEl.style, {
                    background: type === 'error' ? '#ffebee' : '#e8f5e9',
                    color: type === 'error' ? '#d32f2f' : '#388e3c',
                    borderLeft: type === 'error' ? '4px solid #f44336' : '4px solid #4caf50',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginTop: '14px',
                    fontSize: '15px',
                    textAlign: 'center',
                    fontWeight: '500',
                    opacity: '0',
                    transform: 'translateY(-10px)',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                });

                requestAnimationFrame(() => {
                    targetEl.style.opacity = '1';
                    targetEl.style.transform = 'translateY(0)';
                });

                setTimeout(() => {
                    targetEl.style.opacity = '0';
                    targetEl.style.transform = 'translateY(-10px)';
                    setTimeout(() => targetEl.style.display = 'none', 300);
                }, 5001);
            }

            // ==================== UI INITIALIZATION ====================

            // Update user UI
            updateUserUI();

            // Role-based menu setup
            function setupMenuAccess() {
                console.log('🔐 Setting up role-based menu access for:', role);

                if (isAdmin) {
                    // Admin: Show all menu items
                    $$('.admin-only').forEach(el => el.style.display = 'flex');
                    $$('.all-roles').forEach(el => el.style.display = 'flex');

                    // Set dashboard as default for admin
                    $$('.content-section').forEach(section => section.classList.remove('active'));
                    $$('.menu-item, .submenu-item').forEach(item => item.classList.remove('active'));

                    const dashboardSection = byId('dashboard');
                    const dashboardMenu = $('.menu-item[data-section="dashboard"]');
                    if (dashboardSection) dashboardSection.classList.add('active');
                    if (dashboardMenu) dashboardMenu.classList.add('active');

                    console.log('✅ Admin access: All menu items visible, dashboard active');
                } else {
                    // Counselor/Therapist: Hide admin-only sections
                    $$('.admin-only').forEach(el => el.style.display = 'none');
                    $$('.all-roles').forEach(el => el.style.display = 'flex');

                    // Set appointments as default for non-admins
                    $$('.content-section').forEach(section => section.classList.remove('active'));
                    $$('.menu-item, .submenu-item').forEach(item => item.classList.remove('active'));

                    const appointmentsSection = byId('my-appointments');
                    const appointmentsMenu = $('.menu-item[data-submenu="appointments-menu"]');
                    const appointmentsMenuItem = $('.submenu-item[data-section="my-appointments"]');

                    if (appointmentsSection) appointmentsSection.classList.add('active');
                    if (appointmentsMenu) {
                        appointmentsMenu.classList.add('active');
                        const submenu = byId('appointments-menu');
                        if (submenu) submenu.classList.add('open');
                    }
                    if (appointmentsMenuItem) appointmentsMenuItem.classList.add('active');

                    console.log('✅ Counselor/Therapist access: Limited menu items, appointments active');
                }
            }
            setupMenuAccess();

            // Sidebar toggle
            on($('.toggle-sidebar'), 'click', function() {
                const sidebar = $('.sidebar');
                const overlay = $('.sidebar-overlay');
                if (sidebar) sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('open');
            });

            on($('.sidebar-overlay'), 'click', function() {
                const sidebar = $('.sidebar');
                if (sidebar) sidebar.classList.remove('open');
                this.classList.remove('open');
            });

            // Submenu toggle
            $$('.menu-item.has-submenu').forEach(item => {
                on(item, 'click', function(e) {
                    e.stopPropagation();
                    if (this.classList.contains('disabled')) return;

                    const submenuId = this.getAttribute('data-submenu');
                    const submenu = byId(submenuId);
                    const chevron = this.querySelector('.fa-chevron-down');

                    if (submenu) submenu.classList.toggle('open');
                    if (chevron) chevron.classList.toggle('rotate-180');
                });
            });

            // Navigation handler
            $$('.menu-item, .submenu-item').forEach(link => {
                on(link, 'click', function(e) {
                    e.stopPropagation();
                    if (this.classList.contains('disabled')) return;

                    const sectionId = this.getAttribute('data-section');
                    if (!sectionId) return;

                    // Role-based access control
                    if (!isAdmin && this.classList.contains('admin-only')) {
                        notify('Access denied - Admin only section', 'warning');
                        return;
                    }

                    // Switch sections
                    $$('.content-section').forEach(section => section.classList.remove('active'));
                    const targetSection = byId(sectionId);
                    if (targetSection) targetSection.classList.add('active');

                    // Update menu highlighting
                    $$('.menu-item, .submenu-item').forEach(item => item.classList.remove('active'));
                    this.classList.add('active');

                    // Handle submenus
                    if (!this.classList.contains('submenu-item')) {
                        $$('.submenu').forEach(submenu => submenu.classList.remove('open'));
                        $$('.menu-item .fa-chevron-down').forEach(chevron => chevron.classList.remove('rotate-180'));
                    }

                    // Close mobile sidebar
                    if (window.innerWidth < 992) {
                        const sidebar = $('.sidebar');
                        const overlay = $('.sidebar-overlay');
                        if (sidebar) sidebar.classList.remove('open');
                        if (overlay) overlay.classList.remove('open');
                    }

                    // Initialize section content
                    setTimeout(() => initSection(sectionId), 150);
                });
            });

            function initSection(sectionId) {
                console.log(`🔧 Initializing: ${sectionId}`);

                // Update page title based on section and role
                const pageTitle = $('.page-title h1');
                if (pageTitle) {
                    const titleMap = {
                        'dashboard': 'Dashboard Overview',
                        'my-appointments': isAdmin ? 'All Appointments' : 'My Appointments',
                        'profile': 'Profile',
                        'settings': 'Settings',
                        'all-users': 'User Management',
                        'user-roles': 'User Roles',
                        'user-activity': 'User Activity',
                        'requests': 'Appointment Requests',
                        'history': 'Appointment History',
                        'videos': 'Video Resources',
                        'audio': 'Audio Resources',
                        'posters': 'Poster Resources',
                        'guides': 'Guide Resources',
                        'analytics': 'Analytics'
                    };

                    if (titleMap[sectionId]) {
                        setTimeout(() => {
                            const currentSection = byId(sectionId);
                            const currentPageTitle = currentSection && currentSection.querySelector('.page-title h1');
                            if (currentPageTitle) {
                                currentPageTitle.textContent = titleMap[sectionId];
                            }
                        }, 50);
                    }
                }

                switch (sectionId) {
                    case 'profile':
                        loadProfile();
                        break;
                    case 'my-appointments':
                        loadMyAppointments();
                        break;
                    case 'all-users':
                        if (isAdmin) loadUsers();
                        else notify('Access denied - Admin only', 'warning');
                        break;
                    case 'dashboard':
                        if (isAdmin) {
                            initCharts();
                            loadDashboardStats(); // Load actual stats from database
                        } else notify('Access denied - Admin only', 'warning');
                        break;
                    default:
                        if (!isAdmin && !['my-appointments', 'profile', 'settings'].includes(sectionId)) {
                            notify('Access denied - Admin only', 'warning');
                            // Redirect to appointments for non-admins
                            setTimeout(() => {
                                $$('.content-section').forEach(section => section.classList.remove('active'));
                                $$('.menu-item, .submenu-item').forEach(item => item.classList.remove('active'));

                                const appointmentsSection = byId('my-appointments');
                                const appointmentsMenuItem = $('.submenu-item[data-section="my-appointments"]');
                                if (appointmentsSection) appointmentsSection.classList.add('active');
                                if (appointmentsMenuItem) appointmentsMenuItem.classList.add('active');

                                loadMyAppointments();
                            }, 1500);
                        }
                        break;
                }
            }

            // Logout handler
            on(byId('logout-btn'), 'click', function() {
                showLogoutAlert();
            });

            // Custom logout alert functions
            function showLogoutAlert() {
                const overlay = byId('logout-alert-overlay');
                if (overlay) {
                    overlay.classList.add('show', 'animate');
                    document.body.style.overflow = 'hidden';
                }
            }

            function hideLogoutAlert() {
                const overlay = byId('logout-alert-overlay');
                if (overlay) {
                    overlay.classList.remove('show', 'animate');
                    document.body.style.overflow = '';
                }
            }

            function performLogout() {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('userInfo');
                notify('Logging out...', 'info');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }

            // Logout alert event handlers
            on(byId('logout-cancel-btn'), 'click', hideLogoutAlert);
            on(byId('logout-confirm-btn'), 'click', function() {
                hideLogoutAlert();
                performLogout();
            });

            // Close alert when clicking outside
            on(byId('logout-alert-overlay'), 'click', function(e) {
                if (e.target === this) {
                    hideLogoutAlert();
                }
            });

            // Handle escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const overlay = byId('logout-alert-overlay');
                    if (overlay && overlay.classList.contains('show')) {
                        hideLogoutAlert();
                    }
                }
            });

            // ==================== PROFILE MANAGEMENT ====================

            async function loadProfile() {
                try {
                    console.log('👤 Loading profile...');
                    const data = await api('/profile');

                    const profileData = data.admin || data.user;
                    if (!profileData) throw new Error('No profile data received');

                    console.log('✅ Profile loaded:', profileData.email);
                    populateProfile(profileData);

                    // Update header avatar with new profile picture if available
                    const headerAvatar = document.querySelector('.user-avatar');
                    const newInitials = (profileData.firstName.charAt(0) + (profileData.lastName ? profileData.lastName.charAt(0) : '')).toUpperCase();
                    updateAvatarDisplay(headerAvatar, profileData.profilePicture, newInitials);

                    showSuccess('profile-success-message', 'Profile loaded successfully!');

                } catch (error) {
                    console.error('❌ Profile load failed:', error);
                    showSuccess('profile-email-error', `Failed to load profile: ${error.message}`, 'error');
                }
            }

            function populateProfile(data) {
                if (!data) {
                    console.error('No data to populate');
                    return;
                }

                console.log('📝 Populating profile form...');

                // Field mapping
                const fields = {
                    'profile-first-name': data.firstName || '',
                    'profile-last-name': data.lastName || '',
                    'profile-email': data.email || '',
                    'profile-mobile': data.mobile || '',
                    'profile-role': data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'Unknown',
                    'profile-bio': data.bio || '',
                    'profile-specialties': data.specialties || '',
                    'profile-experience': data.experience || 0,
                    'profile-qualifications': data.qualifications || '',
                    'profile-languages': data.languages || ''
                };

                // Populate all fields
                Object.entries(fields).forEach(([id, value]) => {
                    const el = byId(id);
                    if (el) {
                        el.value = typeof value === 'number' ? value.toString() : value;

                        // Role field should be readonly for security
                        if (id === 'profile-role') {
                            el.disabled = true;
                            el.style.backgroundColor = '#f5f5f5';
                            el.style.color = '#666';
                            el.style.cursor = 'not-allowed';
                        } else {
                            el.disabled = false;
                            el.style.backgroundColor = '#fff';
                            el.style.color = '#333';
                            el.style.cursor = 'text';
                        }
                    }
                });

                // Show current profile picture if available
                const profilePictureInput = byId('profile-picture');
                if (profilePictureInput && data.profilePicture) {
                    let previewEl = byId('current-profile-picture-preview');
                    if (!previewEl) {
                        previewEl = document.createElement('div');
                        previewEl.id = 'current-profile-picture-preview';
                        previewEl.style.cssText = `
                    margin-top: 10px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    background: #f9f9f9;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `;
                        profilePictureInput.parentNode.appendChild(previewEl);
                    }

                    previewEl.innerHTML = `
                <img src="${data.profilePicture}" alt="Current profile picture" 
                     style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">
                <span style="color: #666; font-size: 14px;">Current profile picture</span>
            `;
                }

                // Show all professional fields
                $$('.professional-field').forEach(field => {
                    field.style.display = 'block';
                    field.style.opacity = '1';
                });

                console.log('✅ Profile form populated with picture:', data.profilePicture ? 'Yes' : 'No');
            }

            // Profile form submission
            const profileForm = byId('profile-update-form');
            if (profileForm) {
                on(profileForm, 'submit', async e => {
                    e.preventDefault();
                    console.log('🔄 Updating profile...');

                    clearErrors('profile-update-form');
                    const successEl = profileForm.querySelector('.success-message');
                    if (successEl) successEl.style.display = 'none';

                    const submitBtn = profileForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn && submitBtn.textContent || 'Update Profile';

                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Saving...';
                        submitBtn.style.opacity = '0.7';
                    }

                    try {
                        // Collect ALL fields
                        const updateData = {
                            firstName: (byId('profile-first-name') && byId('profile-first-name').value.trim()) || '',
                            lastName: (byId('profile-last-name') && byId('profile-last-name').value.trim()) || '',
                            email: (byId('profile-email') && byId('profile-email').value.trim()) || '',
                            mobile: (byId('profile-mobile') && byId('profile-mobile').value.trim()) || '',
                            bio: (byId('profile-bio') && byId('profile-bio').value.trim()) || '',
                            specialties: (byId('profile-specialties') && byId('profile-specialties').value.trim()) || '',
                            experience: parseInt((byId('profile-experience') && byId('profile-experience').value) || '0') || 0,
                            qualifications: (byId('profile-qualifications') && byId('profile-qualifications').value.trim()) || '',
                            languages: (byId('profile-languages') && byId('profile-languages').value.trim()) || ''
                        };

                        // Validation
                        if (!updateData.firstName) {
                            showFieldError('profile-first-name-error', 'First name is required');
                            return;
                        }
                        if (!updateData.lastName) {
                            showFieldError('profile-last-name-error', 'Last name is required');
                            return;
                        }
                        if (!updateData.email || !/\S+@\S+\.\S+/.test(updateData.email)) {
                            showFieldError('profile-email-error', 'Valid email is required');
                            return;
                        }
                        if (!updateData.mobile || !/^\d{10}$/.test(updateData.mobile)) {
                            showFieldError('profile-mobile-error', '10-digit mobile number is required');
                            return;
                        }
                        if (!updateData.bio.trim()) {
                            showFieldError('profile-bio-error', 'Bio is required');
                            return;
                        }
                        if (updateData.experience < 0 || isNaN(updateData.experience)) {
                            showFieldError('profile-experience-error', 'Experience must be 0 or greater');
                            return;
                        }

                        // Prepare payload
                        const profilePictureInput = byId('profile-picture');
                        const file = profilePictureInput && profilePictureInput.files && profilePictureInput.files[0];
                        let payload;
                        if (file) {
                            const fd = new FormData();
                            fd.append('profilePicture', file);
                            Object.entries(updateData).forEach(([k, v]) => fd.append(k, v));
                            payload = fd;
                        } else {
                            payload = JSON.stringify(updateData);
                        }

                        console.log('📤 Updating with:', updateData, file ? '(with image)' : '(no image)');

                        const data = await api('/profile', {
                            method: 'PUT',
                            body: payload
                        });

                        console.log('✅ Update response:', data);

                        if (data.success) {
                            showSuccess('profile-success-message', 'Profile updated successfully!');

                            // Update localStorage with new profile data
                            const updatedInfo = {...userInfo, ...updateData };
                            if (data.admin && data.admin.profilePicture) {
                                updatedInfo.profilePicture = data.admin.profilePicture;
                            }
                            localStorage.setItem('userInfo', JSON.stringify(updatedInfo));

                            // Update header avatar immediately
                            const headerAvatar = document.querySelector('.user-avatar');
                            const newInitials = (updateData.firstName.charAt(0) + (updateData.lastName ? updateData.lastName.charAt(0) : '')).toUpperCase();
                            updateAvatarDisplay(headerAvatar, data.admin && data.admin.profilePicture ? data.admin.profilePicture : null, newInitials);

                            // Refresh form
                            if (data.admin) populateProfile(data.admin);

                            notify('Profile saved!', 'success');
                        } else {
                            throw new Error(data.message || 'Update failed');
                        }

                    } catch (error) {
                        console.error('❌ Update failed:', error);
                        showSuccess('profile-email-error', `Update failed: ${error.message}`, 'error');
                    } finally {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                            submitBtn.style.opacity = '1';
                        }
                    }
                });

                console.log('✅ Profile form ready - All fields editable!');
            }

            // ==================== USER MANAGEMENT ====================

            async function loadUsers() {
                try {
                    console.log('👥 Loading all users (from both User and Admin collections)...');

                    // Show loading state
                    const tbody = byId('users-table-body');
                    if (tbody) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="6" style="text-align:center;padding:40px;color:#666;">
                                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                                    <br>Loading all users...
                                </td>
                            </tr>
                        `;
                    }

                    const data = await api('/users');
                    console.log('📡 Users API response:', data);

                    if (data && data.success && Array.isArray(data.users)) {
                        populateUsersTable(data.users);
                        console.log(`✅ Loaded ${data.users.length} users total`);

                        // Show breakdown if available
                        if (data.breakdown) {
                            console.log('👥 User breakdown:', data.breakdown);
                        }

                        // Update users count in UI if element exists
                        const usersCountEl = document.querySelector('.stats-cards .stat-card:first-child .stat-info h3');
                        if (usersCountEl) {
                            usersCountEl.textContent = data.users.length.toLocaleString();
                        }

                        // Update table title with breakdown
                        notify(`Loaded ${data.users.length} users successfully`, 'success');
                    } else {
                        console.log('📭 No users found or invalid response:', data);
                        populateUsersTable([]);
                        notify('No users found in the database', 'info');
                    }
                } catch (error) {
                    console.error('❌ Users load failed:', error);
                    populateUsersTable([]);

                    // Show detailed error message
                    const tbody = byId('users-table-body');
                    if (tbody) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="6" style="text-align:center;padding:40px;color:#f44336;">
                                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                                    <br><strong>Failed to load users</strong>
                                    <br><small>${error.message}</small>
                                    <br><br>
                                    <button class="btn btn-primary" onclick="window.loadUsers()">
                                        <i class="fas fa-retry"></i> Try Again
                                    </button>
                                </td>
                            </tr>
                        `;
                    }

                    // Show specific error messages
                    if (error.message.includes('User model not found')) {
                        notify('Database configuration error. Please contact system administrator.', 'error');
                    } else if (error.message.includes('Network')) {
                        notify('Network error. Please check your connection and try again.', 'error');
                    } else {
                        notify(`Failed to load users: ${error.message}`, 'error');
                    }
                }
            }

            function populateUsersTable(users) {
                const tbody = byId('users-table-body');
                if (!tbody) {
                    console.error('❌ Users table body not found');
                    return;
                }

                if (!Array.isArray(users)) {
                    console.error('❌ Users data is not an array:', users);
                    users = [];
                }

                tbody.innerHTML = users.length ?
                    users.map(user => {
                            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
                            const email = user.email || 'N/A';
                            const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
                            const status = user.status || 'active';
                            const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            }) : 'N/A';
                            const userId = user._id || '';
                            const source = user.source || 'unknown';

                            // Status styling
                            const statusClass = status.toLowerCase();
                            const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);

                            // Role-specific styling
                            let roleClass = role.toLowerCase();
                            if (role.toLowerCase() === 'counselor') roleClass = 'counselor';
                            else if (role.toLowerCase() === 'therapist') roleClass = 'therapist';
                            else if (role.toLowerCase() === 'admin') roleClass = 'admin';
                            else roleClass = 'user';

                            return `
                    <tr>
                        <td>
                            <div style="display: flex; flex-direction: column;">
                                <strong>${fullName}</strong>
                                ${user.mobile ? `<small style="color: #666;">${user.mobile}</small>` : ''}
                                ${source === 'admin' && (user.specialties || user.bio) ? `<small style="color: #4073c0; font-style: italic;">${user.specialties || user.bio.substring(0, 30) + (user.bio.length > 30 ? '...' : '')}</small>` : ''}
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; flex-direction: column;">
                                <span>${email}</span>
                                ${user.isVerified ? '<small style="color: #4caf50;"><i class="fas fa-check-circle"></i> Verified</small>' : '<small style="color: #ff9800;"><i class="fas fa-clock"></i> Unverified</small>'}
                                ${source === 'admin' ? '<small style="color: #6b8eba;"><i class="fas fa-shield-alt"></i> Professional</small>' : ''}
                            </div>
                        </td>
                        <td><span class="status ${roleClass}" style="text-transform: capitalize;">${role}</span></td>
                        <td><span class="status ${statusClass}">${statusDisplay}</span></td>
                        <td>${joinDate}</td>
                        <td>
                            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                <button class="action-btn view-btn" data-id="${userId}" data-source="${source}" title="View Details">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                ${source === 'user' ? `
                                    <button class="action-btn edit-btn" data-id="${userId}" data-source="${source}" title="Edit User">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    ${status !== 'suspended' ? `
                                        <button class="action-btn delete-btn" data-id="${userId}" data-source="${source}" title="Suspend User">
                                            <i class="fas fa-ban"></i> Suspend
                                        </button>
                                    ` : `
                                        <button class="action-btn edit-btn" data-id="${userId}" data-source="${source}" title="Activate User" style="background-color: rgba(76, 175, 80, 0.1); color: #4caf50;">
                                            <i class="fas fa-check"></i> Activate
                                        </button>
                                    `}
                                ` : `
                                    <button class="action-btn view-btn" data-id="${userId}" data-source="${source}" title="View Professional Profile" style="background-color: rgba(94, 96, 206, 0.1); color: #5e60ce;">
                                        <i class="fas fa-user-md"></i> Profile
                                    </button>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
                    }).join('') :
                    `<tr>
                        <td colspan="6" style="text-align:center;padding:30px;color:#666;font-style:italic;">
                            <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                            <br><strong>No users found</strong>
                            <br>Users will appear here once they register on the platform.
                        </td>
                    </tr>`;

                // Bind action buttons with improved error handling
                $$('.action-btn').forEach(btn => {
                    on(btn, 'click', function() {
                        const id = this.dataset.id;
                        const source = this.dataset.source;
                        if (!id) {
                            notify('User ID not found', 'warning');
                            return;
                        }
                        
                        const action = this.classList.contains('view-btn') ? 'view' :
                            this.classList.contains('edit-btn') ? 'edit' : 'suspend';

                        handleUserAction(id, action, this, source);
                    });
                });
                
                console.log(`✅ Users table populated with ${users.length} entries`);
            }

            function handleUserAction(id, action, buttonElement, source = 'user') {
                if (!id) {
                    notify('No user selected', 'warning');
                    return;
                }

                switch (action) {
                    case 'view':
                        if (source === 'admin') {
                            notify(`Viewing professional profile for ID: ${id} - Feature coming soon`, 'info');
                        } else {
                            notify(`Viewing user details for ID: ${id} - Feature coming soon`, 'info');
                        }
                        break;
                    case 'edit':
                        if (buttonElement.textContent.includes('Activate')) {
                            if (confirm('Activate this user? They will be able to access the platform again.')) {
                                updateUserStatus(id, 'active', source);
                            }
                        } else {
                            if (source === 'admin') {
                                notify(`Edit professional profile ${id} - Feature coming soon`, 'info');
                            } else {
                                notify(`Edit user ${id} - Feature coming soon`, 'info');
                            }
                        }
                        break;
                    case 'suspend':
                        if (source === 'admin') {
                            notify('Cannot suspend professional accounts from this interface', 'warning');
                        } else {
                            if (confirm('Suspend this user? They will not be able to access the platform.')) {
                                updateUserStatus(id, 'suspended', source);
                            }
                        }
                        break;
                }
            }

            async function updateUserStatus(id, newStatus) {
                try {
                    // This would need a backend endpoint to update user status
                    notify(`User status update to ${newStatus} - Backend endpoint needed`, 'warning');
                    // For now, just reload the users to show current state
                    setTimeout(() => loadUsers(), 1000);
                } catch (error) {
                    notify(`Failed to update user status: ${error.message}`, 'error');
                }
            }

            async function deleteUser(id) {
                try {
                    const data = await api(`/users/${id}`, { method: 'DELETE' });
                    notify('User deleted successfully!', 'success');
                    loadUsers();
                } catch (error) {
                    notify(`Delete failed: ${error.message}`, 'error');
                }
            }

            // Add refresh button handler for users
            on(byId('refresh-users-btn'), 'click', function() {
                console.log('🔄 Refreshing users...');
                loadUsers();
            });

            // User creation form
            const addUserForm = byId('add-user-form');
            const signupForm = byId('signup-form');

            if (addUserForm && signupForm) {
                on(byId('add-new-user-btn'), 'click', () => {
                    addUserForm.classList.toggle('hidden');
                    if (!addUserForm.classList.contains('hidden')) {
                        signupForm.reset();
                        clearErrors('signup-form');
                    }
                });

                // Password toggles
                on(byId('toggle-signup-password'), 'click', function() {
                    const input = byId('signup-password');
                    if (input) {
                        input.type = input.type === 'password' ? 'text' : 'password';
                        const icon = this.querySelector('i');
                        if (icon) icon.classList.toggle('fa-eye-slash');
                    }
                });

                on(byId('toggle-confirm-password'), 'click', function() {
                    const input = byId('confirm-password');
                    if (input) {
                        input.type = input.type === 'password' ? 'text' : 'password';
                        const icon = this.querySelector('i');
                        if (icon) icon.classList.toggle('fa-eye-slash');
                    }
                });

                // Form submission
                on(signupForm, 'submit', async e => {
                    e.preventDefault();
                    clearErrors('signup-form');

                    const btn = signupForm.querySelector('button[type="submit"]');
                    const originalText = btn && btn.textContent;
                    if (btn) {
                        btn.disabled = true;
                        btn.textContent = 'Creating...';
                        btn.style.opacity = '0.7';
                    }

                    try {
                        const formData = {
                            firstName: (byId('first-name') && byId('first-name').value.trim()) || '',
                            lastName: (byId('last-name') && byId('last-name').value.trim()) || '',
                            email: (byId('signup-email') && byId('signup-email').value.trim()) || '',
                            mobile: (byId('mobile') && byId('mobile').value.trim()) || '',
                            role: (byId('role') && byId('role').value) || '',
                            password: (byId('signup-password') && byId('signup-password').value) || '',
                            confirmPassword: (byId('confirm-password') && byId('confirm-password').value) || ''
                        };

                        // Validation
                        const errors = [];
                        if (!formData.firstName) errors.push(['first-name-error', 'First name required']);
                        if (!formData.lastName) errors.push(['last-name-error', 'Last name required']);
                        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) errors.push(['signup-email-error', 'Valid email required']);
                        if (!formData.mobile || !/^\d{10}$/.test(formData.mobile)) errors.push(['mobile-error', '10-digit mobile required']);
                        if (!formData.role) errors.push(['role-error', 'Role required']);
                        if (!formData.password || formData.password.length < 6) errors.push(['signup-password-error', 'Password must be 6+ characters']);
                        if (formData.password !== formData.confirmPassword) errors.push(['confirm-password-error', 'Passwords must match']);

                        if (errors.length) {
                            errors.forEach(([id, msg]) => showFieldError(id, msg));
                            throw new Error('Validation failed');
                        }

                        const data = await api('/signup', {
                            method: 'POST',
                            body: JSON.stringify({
                                firstName: formData.firstName,
                                lastName: formData.lastName,
                                email: formData.email,
                                mobile: formData.mobile,
                                role: formData.role,
                                password: formData.password
                            })
                        });

                        showSuccess('signup-success-message', `Account created successfully for ${formData.firstName} ${formData.lastName}!`);
                        notify(`New user ${formData.firstName} ${formData.lastName} created successfully!`, 'success');

                        setTimeout(() => {
                            signupForm.reset();
                            addUserForm.classList.add('hidden');
                            loadUsers();
                        }, 2000);

                    } catch (error) {
                        console.error('❌ User creation failed:', error);
                        showSuccess('signup-email-error', error.message, 'error');
                    } finally {
                        if (btn) {
                            btn.disabled = false;
                            btn.textContent = originalText;
                            btn.style.opacity = '1';
                        }
                    }
                });
            }

            // ==================== SCHEDULE MANAGEMENT ====================

            let currentDate = new Date();

            function updateDateDisplay() {
                const dateEl = byId('current-date');
                if (!dateEl) return;

                dateEl.textContent = currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                const scheduleSection = byId('schedule');
                if (scheduleSection && scheduleSection.classList.contains('active')) {
                    loadSchedule();
                }
            }

            async function loadSchedule() {
                try {
                    const data = await api(`/schedule?date=${currentDate.toISOString().split('T')[0]}`);
                    populateSchedule(data.appointments || []);
                } catch (error) {
                    console.error('Schedule load failed:', error);
                    populateSchedule([]);
                }
            }

            function populateSchedule(appointments) {
                const container = byId('schedule-container');
                if (!container) return;

                const timeSlots = [
                    { time: '9:00 AM - 10:00 AM', hour: 9 },
                    { time: '10:00 AM - 11:00 AM', hour: 10 },
                    { time: '11:00 AM - 12:00 PM', hour: 11 },
                    { time: '12:00 PM - 1:00 PM', hour: 12 },
                    { time: '1:00 PM - 2:00 PM', hour: 13 },
                    { time: '2:00 PM - 3:00 PM', hour: 14 },
                    { time: '3:00 PM - 4:00 PM', hour: 15 },
                    { time: '4:00 PM - 5:00 PM', hour: 16 },
                    { time: '5:00 PM - 6:00 PM', hour: 17 },
                    { time: '6:00 PM - 7:00 PM', hour: 18 }
                ];

                container.innerHTML = timeSlots.map((slot, i) => {
                    const isLunch = slot.hour === 12;
                    const appointment = appointments.find(apt => {
                        if (!apt || !apt.dateTime) return false;
                        const aptDate = new Date(apt.dateTime);
                        return aptDate.getHours() === slot.hour &&
                            aptDate.getDate() === currentDate.getDate() &&
                            aptDate.getMonth() === currentDate.getMonth() &&
                            aptDate.getFullYear() === currentDate.getFullYear();
                    });

                    const status = isLunch ? 'unavailable' :
                        appointment ? 'booked' : 'available';

                    const statusText = isLunch ? 'Lunch Break' :
                        appointment ? 'Booked' : 'Available';

                    const patient = (appointment && appointment.patientName) ||
                        (appointment && appointment.user ? `${appointment.user.firstName} ${appointment.user.lastName}`.trim() : null);

                    const notes = isLunch ? 'Lunch break time' :
                        (appointment && appointment.notes) || 'Click to book this slot';

                    const actions = isLunch ? '<button class="btn btn-secondary" disabled>Not Available</button>' :
                        appointment ? `
                    <button class="btn btn-secondary schedule-action" data-action="view">View</button>
                    <button class="btn btn-primary schedule-action" data-action="reschedule">Reschedule</button>
                ` :
                        '<button class="btn btn-primary schedule-action" data-action="book">Book Appointment</button>';

                    return `
                <div class="schedule-card" style="opacity: 0; transform: translateY(20px); transition: all 0.3s ease ${i * 0.05}s">
                    <div class="slot-header">
                        <div class="slot-time">${slot.time}</div>
                        <span class="slot-status slot-${status}">${statusText}</span>
                    </div>
                    <div class="slot-details">
                        <div class="slot-patient">${isLunch ? 'Not available' : (patient || 'No appointment')}</div>
                        <div class="slot-notes">${notes}</div>
                    </div>
                    <div class="slot-actions">${actions}</div>
                </div>
            `;
                }).join('');

                // Animate cards in
                $$('.schedule-card').forEach((card, i) => {
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, i * 50);
                });

                // Bind actions
                $$('.schedule-action').forEach(btn => {
                    on(btn, 'click', function() {
                        const action = this.dataset.action;
                        const card = this.closest('.schedule-card');
                        const timeEl = card && card.querySelector('.slot-time');
                        const time = timeEl && timeEl.textContent || 'Unknown';

                        switch (action) {
                            case 'book':
                                if (confirm(`Book appointment for ${time}?`)) {
                                    notify(`Booking ${time} - Coming soon!`, 'info');
                                }
                                break;
                            case 'view':
                                notify(`Viewing ${time} - Coming soon!`, 'info');
                                break;
                            case 'reschedule':
                                if (confirm(`Reschedule ${time}?`)) {
                                    notify(`Rescheduling ${time} - Coming soon!`, 'info');
                                }
                                break;
                        }
                    });
                });
            }

            // Date navigation
            on(byId('prev-date'), 'click', () => {
                currentDate.setDate(currentDate.getDate() - 1);
                updateDateDisplay();
            });

            on(byId('next-date'), 'click', () => {
                currentDate.setDate(currentDate.getDate() + 1);
                updateDateDisplay();
            });

            on(byId('today-date'), 'click', () => {
                currentDate = new Date();
                updateDateDisplay();
            });

            // ==================== CHARTS ====================
            function initCharts() {
                if (typeof Chart === 'undefined') {
                    console.warn('📊 Chart.js not loaded');
                    return;
                }

                // Registration trend
                const regCtx = byId('registration-trend-chart');
                if (regCtx) {
                    new Chart(regCtx, {
                        type: 'line',
                        data: {
                            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            datasets: [{
                                label: 'New Users',
                                data: [65, 59, 80, 81, 56, 55, 40],
                                borderColor: '#4073c0',
                                backgroundColor: 'rgba(64, 115, 192, 0.1)',
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: { y: { beginAtZero: true } }
                        }
                    });
                }

                // Appointment status
                const apptCtx = byId('appointment-status-chart');
                if (apptCtx) {
                    new Chart(apptCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Confirmed', 'Pending', 'Cancelled'],
                            datasets: [{
                                data: [65, 25, 10],
                                backgroundColor: ['#4caf50', '#ff9800', '#f44336']
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }

                console.log('📊 Charts initialized');
            }

            // ==================== DASHBOARD STATS ====================
            async function loadDashboardStats() {
                try {
                    console.log('📊 Fetching dashboard statistics...');
                    
                    const response = await api('/stats', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response && response.success && response.stats) {
                        updateStatsDisplay(response.stats);
                        console.log('✅ Dashboard stats loaded successfully');
                    } else {
                        console.error('❌ Invalid stats response:', response);
                        // Use fallback data
                        updateStatsDisplay({
                            totalUsers: 0,
                            totalAppointments: 0,
                            totalResources: 87,
                            totalRevenue: 5240
                        });
                    }
                } catch (error) {
                    console.error('❌ Error loading dashboard stats:', error);
                    // Use fallback data on error
                    updateStatsDisplay({
                        totalUsers: 0,
                        totalAppointments: 0,
                        totalResources: 87,
                        totalRevenue: 5240
                    });
                }
            }

            function updateStatsDisplay(stats) {
                // Update total users
                const statCards = document.querySelectorAll('.stat-card');
                statCards.forEach((card, index) => {
                    const valueEl = card.querySelector('.stat-info h3');
                    if (valueEl) {
                        // Add loading animation
                        valueEl.style.transition = 'all 0.3s ease';
                        valueEl.style.opacity = '0.5';
                        
                        setTimeout(() => {
                            switch (index) {
                                case 0: // Total Users
                                    valueEl.textContent = (stats.totalUsers || 0).toLocaleString();
                                    break;
                                case 1: // Total Appointments  
                                    valueEl.textContent = (stats.totalAppointments || 0).toLocaleString();
                                    break;
                                case 2: // Total Resources
                                    valueEl.textContent = (stats.totalResources || 87).toLocaleString();
                                    break;
                                case 3: // Total Revenue
                                    valueEl.textContent = `₹${(stats.totalRevenue || 5240).toLocaleString()}`;
                                    break;
                            }
                            // Remove loading animation
                            valueEl.style.opacity = '1';
                        }, 200);
                    }
                });

                // Update last updated timestamp
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', { 
                    hour12: true, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                // Show success notification
                notify(`Dashboard stats updated at ${timeString}`, 'success');
                
                console.log('📊 Stats display updated:', stats);
            }

            // ==================== APPOINTMENT MANAGEMENT ====================

            let appointments = [];
            let filteredAppointments = [];

            async function loadMyAppointments() {
                try {
                    console.log('📅 Loading appointments...');
                    showAppointmentsLoading(true);

                    // Get user info
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    const userName = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim();
                    const userRole = userInfo.role ? userInfo.role.toLowerCase() : 'admin';

                    console.log('👤 User info:', { userName, userRole, isAdmin });

                    // Use the API wrapper for consistency
                    const data = await api('/appointments/all');

                    if (data && data.success && data.appointments) {
                        let myAppointments = data.appointments;

                        // Filter appointments based on user role
                        if (isAdmin) {
                            console.log(`✅ Admin view: Showing all ${myAppointments.length} appointments`);
                        } else {
                            myAppointments = data.appointments.filter(appointment => {
                                const specialistFullName = appointment.specialistName || '';
                                return specialistFullName.toLowerCase().includes(userName.toLowerCase()) ||
                                    appointment.specialistId === userInfo.id;
                            });
                            console.log(`✅ Professional view: Found ${myAppointments.length} appointments for ${userName}`);
                        }

                        appointments = myAppointments;
                        filteredAppointments = [...appointments];
                        populateAppointmentsTable(filteredAppointments);
                    } else {
                        console.log('📭 No appointments found');
                        appointments = [];
                        filteredAppointments = [];
                        populateAppointmentsTable([]);
                    }
                } catch (error) {
                    console.error('❌ Failed to load appointments:', error);
                    appointments = [];
                    filteredAppointments = [];
                    populateAppointmentsTable([]);
                    showAppointmentsError('Failed to load appointments: ' + error.message);
                } finally {
                    showAppointmentsLoading(false);
                }
            }

            function showAppointmentsLoading(show) {
                const loadingEl = byId('appointments-loading');
                const containerEl = byId('appointments-container');
                const noDataEl = byId('no-appointments');

                if (loadingEl) loadingEl.style.display = show ? 'block' : 'none';
                if (containerEl) containerEl.style.display = show ? 'none' : 'block';
                if (noDataEl) noDataEl.style.display = 'none';
            }

            function showAppointmentsError(message) {
                const containerEl = byId('appointments-container');
                const noDataEl = byId('no-appointments');

                if (containerEl) containerEl.style.display = 'none';
                if (noDataEl) {
                    noDataEl.style.display = 'block';
                    noDataEl.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>
                <h3>Error Loading Appointments</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.loadMyAppointments()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            `;
                }
            }

            function populateAppointmentsTable(appointmentsList) {
                const tbody = byId('appointments-table-body');
                const containerEl = byId('appointments-container');
                const noDataEl = byId('no-appointments');
                const tableHead = byId('appointments-table-head');

                if (!tbody) return;

                if (appointmentsList.length === 0) {
                    if (containerEl) containerEl.style.display = 'none';
                    if (noDataEl) {
                        noDataEl.style.display = 'block';
                        noDataEl.innerHTML = `
                    <i class="fas fa-calendar-times"></i>
                    <h3>No Appointments Found</h3>
                    <p>No appointments found matching the current filters.</p>
                `;
                    }
                    return;
                }

                if (containerEl) containerEl.style.display = 'block';
                if (noDataEl) noDataEl.style.display = 'none';

                // Update table title based on role
                const tableTitle = byId('appointments-table-title');
                if (tableTitle) {
                    tableTitle.textContent = isAdmin ?
                        `All Booked Sessions (${appointmentsList.length})` :
                        `My Booked Sessions (${appointmentsList.length})`;
                }

                // Update table headers based on role
                if (tableHead) {
                    tableHead.innerHTML = isAdmin ? `
                <tr>
                    <th>Patient</th>
                    <th>Specialist</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            ` : `
                <tr>
                    <th>Patient</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            `;
                }

                tbody.innerHTML = appointmentsList.map(appointment => {
                            const appointmentDate = new Date(appointment.appointmentDate);
                            const formattedDate = appointmentDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                            const formattedTime = appointment.appointmentTime;

                            const typeClass = `type-${appointment.counselingType ? appointment.counselingType.replace(' ', '-') : 'unknown'}`;
                            const typeLabel = getCounselingTypeLabel(appointment.counselingType);

                            const specialistColumn = isAdmin ? `
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <strong>${appointment.specialistName || 'N/A'}</strong>
                        <small style="color: var(--gray-500);">${appointment.specialistRole || 'N/A'}</small>
                    </div>
                </td>
            ` : '';

                            return `
                <tr>
                    <td>
                        <div style="display: flex; flex-direction: column;">
                            <strong>${appointment.patientName}</strong>
                            <small style="color: var(--gray-500);">${appointment.patientEmail}</small>
                        </div>
                    </td>
                    ${specialistColumn}
                    <td>
                        <div style="display: flex; flex-direction: column;">
                            <strong>${formattedDate}</strong>
                            <small style="color: var(--gray-500);">${formattedTime}</small>
                        </div>
                    </td>
                    <td>
                        <span class="appointment-type-badge ${typeClass}">
                            ${typeLabel}
                        </span>
                    </td>
                    <td>
                        <span class="status ${appointment.status}">${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
                    </td>
                    <td>
                        <strong>₹${appointment.totalAmount}</strong>
                    </td>
                    <td>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="action-btn view-btn" onclick="window.viewAppointmentDetails('${appointment._id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${appointment.status === 'pending' ? `
                                <button class="action-btn edit-btn" onclick="window.confirmAppointment('${appointment._id}')">
                                    <i class="fas fa-check"></i> Confirm
                                </button>
                            ` : ''}
                            ${appointment.meetingLink && appointment.status === 'confirmed' ? `
                                <button class="action-btn view-btn" onclick="window.joinMeeting('${appointment.meetingLink}')">
                                    <i class="fas fa-video"></i> Join
                                </button>
                            ` : ''}
                            ${isAdmin ? `
                                <button class="action-btn delete-btn" onclick="window.cancelAppointment('${appointment._id}')">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        console.log(`✅ Populated table with ${appointmentsList.length} appointments`);
    }

    function getCounselingTypeLabel(type) {
        const types = {
            'video-call': 'Video Call',
            'phone-call': 'Phone Call',
            'in-office': 'In-Office'
        };
        return types[type] || type || 'Unknown';
    }

    // Appointment filtering
    function setupAppointmentFilters() {
        const statusFilter = byId('appointment-status-filter');
        const dateFilter = byId('appointment-date-filter');
        const searchInput = byId('patient-search');

        if (statusFilter) {
            on(statusFilter, 'change', filterAppointments);
        }
        if (dateFilter) {
            on(dateFilter, 'change', filterAppointments);
        }
        if (searchInput) {
            on(searchInput, 'input', filterAppointments);
        }
    }

    function filterAppointments() {
        const statusFilter = byId('appointment-status-filter')?.value || '';
        const dateFilter = byId('appointment-date-filter')?.value || 'all';
        const searchTerm = (byId('patient-search')?.value || '').toLowerCase();

        filteredAppointments = appointments.filter(appointment => {
            // Status filter
            if (statusFilter && appointment.status !== statusFilter) {
                return false;
            }

            // Date filter
            if (dateFilter !== 'all') {
                const appointmentDate = new Date(appointment.appointmentDate);
                const today = new Date();
                const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                switch (dateFilter) {
                    case 'today':
                        if (appointmentDate.toDateString() !== new Date().toDateString()) {
                            return false;
                        }
                        break;
                    case 'week':
                        if (appointmentDate < startOfWeek) {
                            return false;
                        }
                        break;
                    case 'month':
                        if (appointmentDate < startOfMonth) {
                            return false;
                        }
                        break;
                }
            }

            // Search filter
            if (searchTerm) {
                const patientName = appointment.patientName.toLowerCase();
                const patientEmail = appointment.patientEmail.toLowerCase();
                
                let matches = patientName.includes(searchTerm) || patientEmail.includes(searchTerm);
                
                if (isAdmin) {
                    const specialistName = (appointment.specialistName || '').toLowerCase();
                    matches = matches || specialistName.includes(searchTerm);
                }
                
                if (!matches) {
                    return false;
                }
            }

            return true;
        });

        populateAppointmentsTable(filteredAppointments);
    }

    // Appointment actions
    async function viewAppointmentDetails(appointmentId) {
        try {
            const appointment = appointments.find(apt => apt._id === appointmentId);
            if (!appointment) {
                notify('Appointment not found', 'error');
                return;
            }

            const modal = byId('appointment-detail-modal');
            const content = byId('appointment-detail-content');

            if (!modal || !content) return;

            const appointmentDate = new Date(appointment.appointmentDate);
            const formattedDate = appointmentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            content.innerHTML = `
                <div class="appointment-detail-grid">
                    <div class="detail-card">
                        <div class="detail-label">Patient Name</div>
                        <div class="detail-value">${appointment.patientName}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${appointment.patientEmail}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${appointment.patientPhone || 'N/A'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${formattedDate}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Time</div>
                        <div class="detail-value">${appointment.appointmentTime}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Type</div>
                        <div class="detail-value">${getCounselingTypeLabel(appointment.counselingType)}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="status ${appointment.status}">
                                ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                        </div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">Amount</div>
                        <div class="detail-value">₹${appointment.totalAmount}</div>
                    </div>
                </div>
                
                ${appointment.concerns ? `
                    <div class="detail-card" style="grid-column: 1 / -1;">
                        <div class="detail-label">Patient Concerns</div>
                        <div class="detail-value">${appointment.concerns}</div>
                    </div>
                ` : ''}
                
                ${appointment.meetingLink ? `
                    <div class="detail-card" style="grid-column: 1 / -1; background: linear-gradient(135deg, var(--primary-color), var(--accent-color)); color: white;">
                        <div class="detail-label" style="color: rgba(255,255,255,0.8);">Meeting Link</div>
                        <div class="detail-value" style="color: white; word-break: break-all;">${appointment.meetingLink}</div>
                        ${appointment.meetingId ? `<div style="margin-top: 0.5rem;"><strong>Meeting ID:</strong> ${appointment.meetingId}</div>` : ''}
                    </div>
                ` : ''}
            `;

            modal.classList.add('show');
        } catch (error) {
            console.error('Error viewing appointment details:', error);
            notify('Failed to load appointment details', 'error');
        }
    }

    async function confirmAppointment(appointmentId) {
        try {
            if (!confirm('Confirm this appointment?')) return;

            const data = await api(`/appointments/${appointmentId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'confirmed' })
            });

            if (data.success) {
                notify('Appointment confirmed successfully!', 'success');
                loadMyAppointments();
            } else {
                throw new Error(data.message || 'Failed to confirm appointment');
            }
        } catch (error) {
            console.error('Error confirming appointment:', error);
            notify(`Failed to confirm appointment: ${error.message}`, 'error');
        }
    }

    async function cancelAppointment(appointmentId) {
        try {
            if (!confirm('Cancel this appointment? This action cannot be undone.')) return;

            const data = await api(`/appointments/${appointmentId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'cancelled' })
            });

            if (data.success) {
                notify('Appointment cancelled successfully!', 'success');
                loadMyAppointments();
            } else {
                throw new Error(data.message || 'Failed to cancel appointment');
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            notify(`Failed to cancel appointment: ${error.message}`, 'error');
        }
    }

    function joinMeeting(meetingLink) {
        if (meetingLink) {
            window.open(meetingLink, '_blank');
            notify('Opening meeting...', 'info');
        } else {
            notify('No meeting link available', 'warning');
        }
    }

    function closeAppointmentModal() {
        const modal = byId('appointment-detail-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // Global functions for button onclick handlers
    window.viewAppointmentDetails = viewAppointmentDetails;
    window.confirmAppointment = confirmAppointment;
    window.cancelAppointment = cancelAppointment;
    window.joinMeeting = joinMeeting;
    window.closeAppointmentModal = closeAppointmentModal;
    window.loadMyAppointments = loadMyAppointments;
            // Expose loadUsers function globally for HTML onclick handlers
            window.loadUsers = loadUsers;
            // Expose loadDashboardStats function globally for HTML onclick handlers
            window.loadDashboardStats = loadDashboardStats;

            // ==================== INITIALIZATION ====================
            function initCurrentSection() {
                const activeSection = $('.content-section.active');
                if (activeSection) {
                    setTimeout(() => initSection(activeSection.id), 200);
                }
            }

            // Start everything
            setTimeout(() => {
                const activeSection = $('.content-section.active');
                if (activeSection) {
                    initSection(activeSection.id);
                } else if (!isAdmin) {
                    initSection('my-appointments');
                } else {
                    initSection('dashboard');
                }
            }, 300);

    updateDateDisplay();

    console.log('🚀 Dashboard fully loaded!');
    console.log(`🔑 Role: ${role} | Admin: ${isAdmin} | Professional: ${isProfessional}`);

    const welcomeMessage = isAdmin ?
        `Welcome to SoulSquad Admin Dashboard, ${firstName}!` :
        `Welcome to SoulSquad, ${firstName}! Your appointments are ready.`;

    notify(welcomeMessage, 'success');
});