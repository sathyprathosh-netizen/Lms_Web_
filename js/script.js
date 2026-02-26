/**
 * APEX-LMS Core System
 * Simulates a full backend/database using LocalStorage.
 * Handles RBAC, Routing, and Global Animations.
 */

const APEX_SYSTEM = {
    // Initialization
    init() {
        this.initDatabase();
        this.checkSession();
        this.setupAnimations();
        this.setupGlobalListeners();
        this.setupCatalogFilters();
        this.setupMobileNav();
        this.initEngagementMatrix();
    },

    // Mock Database Setup
    initDatabase() {
        if (!localStorage.getItem('apex_users')) {
            const mockUsers = [
                { id: 1, email: 'super@apexlms.com', role: 'superadmin', name: 'System Admin' },
                { id: 2, email: 'admin@apexlms.com', role: 'admin', name: 'Instructor Bob' },
                { id: 3, email: 'student@apexlms.com', role: 'learner', name: 'Alice Student' }
            ];
            localStorage.setItem('apex_users', JSON.stringify(mockUsers));
        }
    },

    // Session & RBAC Management
    checkSession() {
        const currentUser = JSON.parse(sessionStorage.getItem('apex_current_user'));
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Auth Guard - Only allow login.html for unauthenticated users
        if (!currentUser && currentPage.toLowerCase() !== 'login.html') {
            window.location.href = 'login.html';
            return;
        }

        if (currentUser) {
            // Set role for CSS UI toggles
            document.body.setAttribute('data-current-role', currentUser.role);

            // Update UI Header
            const userNameDisplay = document.getElementById('global-user-name');
            if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
            const userRoleDisplay = document.getElementById('global-user-role');
            if (userRoleDisplay) userRoleDisplay.textContent = currentUser.role.toUpperCase();

            // Enforce Page Access Rules
            if (currentPage.toLowerCase() === 'login.html' || currentPage.toLowerCase() === 'index.html') {
                this.redirectToDashboard(currentUser.role);
            } else {
                this.enforcePageAccess(currentUser.role, currentPage);
            }
        }
    },

    enforcePageAccess(role, page) {
        const roleRoutes = {
            'superadmin': ['super-admin.html', 'analytics.html'],
            'admin': ['admin/dashboard.html', 'admin/content-studio.html', 'admin/course-inventory.html', 'admin/learner-cohorts.html', 'admin/question-library.html', 'admin/analytics.html'],
            'learner': ['learner.html', 'course-player.html', 'assessment.html', 'certificate.html', 'catalog.html', 'community.html']
        };

        const allowedPages = roleRoutes[role];
        // Simple mock protection: If page is in another role's main list and not in ours
        if (!allowedPages.includes(page) &&
            (roleRoutes['superadmin'].includes(page) ||
                roleRoutes['admin'].includes(page) ||
                roleRoutes['learner'].includes(page))) {
            console.warn(`Access Denied. Role ${role} cannot access ${page}`);
            this.redirectToDashboard(role);
        }
    },

    redirectToDashboard(role) {
        let target = 'login.html';
        if (role === 'superadmin') target = 'super-admin.html';
        if (role === 'admin') target = 'admin/dashboard.html';
        if (role === 'learner') target = 'learner.html';

        // Only redirect if not already there to prevent loops
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPage !== target) {
            window.location.href = target;
        }
    },

    demoLogin(role) {
        const users = JSON.parse(localStorage.getItem('apex_users'));
        const user = users.find(u => u.role === role);
        if (user) {
            sessionStorage.setItem('apex_current_user', JSON.stringify(user));
            this.redirectToDashboard(role);
        }
    },

    standardLogin() {
        const email = document.getElementById('login-email').value;
        const users = JSON.parse(localStorage.getItem('apex_users'));
        const user = users.find(u => u.email === email);

        if (user) {
            sessionStorage.setItem('apex_current_user', JSON.stringify(user));
            this.redirectToDashboard(user.role);
        } else {
            const errorEl = document.getElementById('login-error');
            if (errorEl) {
                errorEl.style.display = 'block';
                setTimeout(() => errorEl.style.display = 'none', 3000);
            }
        }
    },

    logout() {
        sessionStorage.removeItem('apex_current_user');
        window.location.href = 'login.html';
    },

    // Global Animations - Intersection Observer for stagger entries
    setupAnimations() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Trigger counter if class exists
                    if (entry.target.classList.contains('count-up')) {
                        this.animateCounter(entry.target);
                    }

                    // Trigger progress bar width
                    if (entry.target.classList.contains('progress-bar-fill') || entry.target.classList.contains('skill-progress-bar')) {
                        const targetWidth = entry.target.getAttribute('data-target');
                        if (targetWidth) entry.target.style.width = targetWidth;
                    }

                    entry.target.style.animationPlayState = 'running';
                    const animClass = entry.target.getAttribute('data-animate');
                    if (animClass) {
                        entry.target.classList.add(animClass);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Elements should specify `data-animate="animate-fade-in-up"` etc
        document.querySelectorAll('[data-animate], .count-up, .progress-bar-fill, .skill-progress-bar').forEach(el => {
            observer.observe(el);
        });
    },

    animateCounter(el) {
        const target = parseFloat(el.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const startTime = performance.now();
        const startValue = 0;
        const isPercent = el.innerText.includes('%');
        const isRank = el.innerText.includes('#');
        const hasComma = el.getAttribute('data-target').includes(',');

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function: easeOutExpo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            let current = easeProgress * target;

            if (isPercent) {
                el.innerText = Math.floor(current) + '%';
            } else if (isRank) {
                el.innerText = '#' + Math.max(1, Math.round(target - (easeProgress * (target - 1)))); // Counter-intuitive for rank? Usually rank starts high and goes low? No, user said "#4". Maybe count from 50 to 4?
                // Actually user said #4, I'll just count from 100 down or 1 up. Let's stick to 1 to target.
                el.innerText = '#' + Math.ceil(current);
            } else if (hasComma) {
                el.innerText = Math.floor(current).toLocaleString();
            } else {
                el.innerText = Math.floor(current);
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                // Final value cleanup
                if (isPercent) el.innerText = target + '%';
                else if (isRank) el.innerText = '#' + target;
                else if (hasComma) el.innerText = target.toLocaleString();
                else el.innerText = target;
            }
        };

        requestAnimationFrame(update);
    },

    setupGlobalListeners() {
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    },

    setupCatalogFilters() {
        const searchInput = document.getElementById('catalog-search');
        const categoryGroup = document.getElementById('category-filters');
        const levelGroup = document.getElementById('level-filters');
        const courseCards = document.querySelectorAll('.course-card-v3');
        const grid = document.getElementById('catalog-grid');

        if (!grid || !courseCards.length) return;

        const updateFilters = () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const activeCategories = Array.from(categoryGroup.querySelectorAll('input:checked')).map(cb => cb.value);
            const activeLevel = levelGroup.querySelector('input:checked')?.value || 'all';

            let visibleCount = 0;

            courseCards.forEach(card => {
                const title = card.querySelector('h3').innerText.toLowerCase();
                const desc = card.querySelector('p').innerText.toLowerCase();
                const category = card.getAttribute('data-category');
                const level = card.getAttribute('data-level');

                const matchesSearch = title.includes(searchTerm) || desc.includes(searchTerm);
                const matchesCategory = activeCategories.length === 0 || activeCategories.includes(category);
                const matchesLevel = activeLevel === 'all' || activeLevel === level;

                if (matchesSearch && matchesCategory && matchesLevel) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Handle "No Results" state
            let emptyMsg = document.getElementById('catalog-empty-msg');
            if (visibleCount === 0) {
                if (!emptyMsg) {
                    emptyMsg = document.createElement('div');
                    emptyMsg.id = 'catalog-empty-msg';
                    emptyMsg.innerHTML = `
                        <div style="text-align:center; padding: 60px 20px; color:var(--color-text-muted); grid-column: 1 / -1;">
                            <div style="font-size:3rem; margin-bottom:15px;">🔍</div>
                            <h3 style="color:var(--color-primary-dark); margin-bottom:10px;">No exact matches found</h3>
                            <p>Try adjusting your search terms or filters to find what you're looking for.</p>
                            <button class="btn btn-outline" style="margin-top:20px;" onclick="location.reload()">Reset All Filters</button>
                        </div>
                    `;
                    grid.appendChild(emptyMsg);
                }
            } else if (emptyMsg) {
                emptyMsg.remove();
            }
        };

        // Listeners with simple debounce for search
        let debounceTimer;
        searchInput?.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateFilters, 250);
        });

        categoryGroup?.addEventListener('change', updateFilters);
        levelGroup?.addEventListener('change', updateFilters);

        const loadMoreBtn = document.getElementById('load-more-tracks');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreCourses(grid);
                loadMoreBtn.style.display = 'none';
            });
        }
    },

    loadMoreCourses(container) {
        this.showToast('Pulling advanced curricula from global repository...', 'info');

        const additionalCourses = [
            { title: 'Generative AI for Fintech', cat: 'AI & Data', lvl: 'Expert', img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80' },
            { title: 'K8s Cluster Hardening', cat: 'Cybersecurity', lvl: 'Expert', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?auto=format&fit=crop&w=800&q=80' },
            { title: 'Quantum Computing Intro', cat: 'Engineering', lvl: 'Foundational', img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80' },
            { title: 'Advanced Rust Systems', cat: 'Engineering', lvl: 'Expert', img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80' },
            { title: 'Predictive ROI Modeling', cat: 'AI & Data', lvl: 'Expert', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' },
            { title: 'Event-Driven Architecture', cat: 'Cloud Infra', lvl: 'Intermediate', img: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80' }
        ];

        setTimeout(() => {
            additionalCourses.forEach((c, i) => {
                const card = document.createElement('div');
                card.className = 'course-card-v3 animate-fade-in-up';
                card.style.animationDelay = `${i * 100}ms`;
                card.setAttribute('data-category', c.cat);
                card.setAttribute('data-level', c.lvl);
                card.innerHTML = `
                <div class="thumb-box" style="background-image: url('${c.img}');">
                    <span class="category-tag">${c.cat}</span>
                </div>
                <div class="card-inner">
                    <div class="xp-reward">⚡ 2,800 XP Reward</div>
                    <h3>${c.title}</h3>
                    <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 20px;">Expanding your technical horizons with expert-led specialized tracks.</p>
                    <div class="meta-tags">
                        <span>🕒 24 Hours</span>
                        <span>📚 15 Modules</span>
                    </div>
                    <div class="card-footer-v3">
                        <span class="price-text">INCLUDED</span>
                        <button class="btn btn-secondary" onclick="APEX_SYSTEM.openCourseOverview('${c.title}')" style="padding: 10px 24px;">Start Path</button>
                    </div>
                </div>
            `;
                container.appendChild(card);
            });
            this.showToast('24 Advanced Tracks Synchronized!', 'success');
        }, 800);
    },

    setupMobileNav() {
        const toggle = document.createElement('div');
        toggle.className = 'mobile-toggle';
        toggle.innerHTML = '<span></span><span></span><span></span>';
        toggle.id = 'mobile-toggle';
        toggle.style.display = 'none'; // Hidden by CSS until breakpoint

        const navbar = document.querySelector('.navbar') || document.querySelector('.topbar') || document.querySelector('.app-header') || document.querySelector('.player-header') || document.querySelector('.quiz-header');
        const sidebar = document.querySelector('.sidebar') || document.querySelector('.quiz-sidebar') || document.querySelector('.project-sidebar') || document.querySelector('.syllabus-sidebar');

        if (navbar && !navbar.querySelector('.mobile-toggle')) {
            navbar.appendChild(toggle);

            // Create Overlay for non-dashboard pages
            if (!sidebar) {
                const overlay = document.createElement('div');
                overlay.className = 'mobile-nav-overlay';
                overlay.id = 'mobile-nav-overlay';

                const currentUser = JSON.parse(sessionStorage.getItem('apex_current_user')) || { name: 'Guest', role: 'visitor' };
                const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();

                overlay.innerHTML = `
                    <div class="mobile-nav-user">
                        <div style="width: 60px; height: 60px; background: var(--color-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-primary-dark); font-weight: 800; font-size: 1.2rem;">${initials}</div>
                        <div>
                            <div style="color: white; font-weight: 800; font-size: 1.1rem;">${currentUser.name}</div>
                            <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">${currentUser.role}</div>
                        </div>
                    </div>
                    <div class="mobile-nav-links">
                        <a href="learner.html" class="mobile-nav-link" style="transition-delay: 0.3s;"><span>🏠</span> <span>My Workspace</span></a>
                        <a href="catalog.html" class="mobile-nav-link" style="transition-delay: 0.4s;"><span>🎓</span> <span>Catalog</span></a>
                        <a href="certificate.html" class="mobile-nav-link" style="transition-delay: 0.5s;"><span>💼</span> <span>Wallet</span></a>
                        <a href="community.html" class="mobile-nav-link" style="transition-delay: 0.6s;"><span>👥</span> <span>Community</span></a>
                    </div>
                    <div class="mobile-nav-footer">
                        <button class="btn btn-outline" style="width: 100%; color: white; border-color: rgba(255,255,255,0.2);" onclick="APEX_SYSTEM.logout()">Secure Logout</button>
                    </div>
                `;

                document.body.appendChild(overlay);

                toggle.addEventListener('click', () => {
                    const isActive = toggle.classList.toggle('active');
                    overlay.classList.toggle('active');
                    document.body.style.overflow = isActive ? 'hidden' : '';
                });
            } else {
                // Dashboard logic - toggle sidebar
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('active');
                    sidebar.classList.toggle('active');
                });

                // Add close button inside sidebar for mobile
                const closeBtn = document.createElement('div');
                closeBtn.style.padding = '20px';
                closeBtn.style.textAlign = 'right';
                closeBtn.innerHTML = '✕';
                closeBtn.style.fontSize = '1.5rem';
                closeBtn.style.cursor = 'pointer';
                sidebar.prepend(closeBtn);

                closeBtn.addEventListener('click', () => {
                    toggle.classList.remove('active');
                    sidebar.classList.remove('active');
                });
            }
        }
    },

    // UI Utilities for Phase 3
    notify(message, type = 'success') {
        this.showToast(message, type);
    },

    openAssetPreview(assetName, type) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay animate-fade-in';
        
        let content = '';
        if (type === 'video') {
            content = `
                <div style="background:black; aspect-ratio:16/9; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-direction:column; color:white; border:1px solid rgba(255,255,255,0.1); overflow:hidden; position:relative;">
                    <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(45deg, #1e1b4b, #06b6d4, #a3e635); opacity:0.1;"></div>
                    <div style="font-size:4rem; margin-bottom:20px; filter: drop-shadow(0 0 20px #06b6d4);">▶️</div>
                    <div style="font-weight:800; font-size:1.2rem; letter-spacing:2px;">STREAMING: ${assetName}</div>
                    <div style="font-family:monospace; font-size:0.8rem; margin-top:10px; color:#a3e635;">[ 00:24:12 / 01:05:00 ]</div>
                    <div style="position:absolute; bottom:20px; left:20px; right:20px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px;">
                        <div style="width:40%; height:100%; background:#06b6d4; border-radius:2px; box-shadow: 0 0 10px #06b6d4;"></div>
                    </div>
                </div>
            `;
        } else if (type === 'document') {
            content = `
                <div style="background:white; padding:40px; border-radius:12px; max-height:70vh; overflow-y:auto; border:1px solid #e2e8f0; color:#1e293b;">
                    <div style="border-bottom:2px solid #f1f5f9; padding-bottom:20px; margin-bottom:20px;">
                        <h2 style="margin:0; font-size:1.5rem;">${assetName}</h2>
                        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">VERSION: v2.4a | STATUS: VALIDATED</span>
                    </div>
                    <div style="font-family:'Outfit', sans-serif; line-height:1.6; font-size:1rem;">
                        <h4 style="color:#1e1b4b;">1.0 Executive Summary</h4>
                        <p>This technical directive outlines the neural orchestration protocols for the Acme Global cluster. Stakeholders must adhere to the vector-proximity guidelines established in sub-section 4.2.</p>
                        <div style="background:#f8fafc; padding:20px; border-radius:8px; margin:20px 0; border-left:4px solid #06b6d4;">
                            <p style="margin:0; font-style:italic;">"The transition to zero-trust neural nodes is mandatory for all Q3 deployments."</p>
                        </div>
                        <h4 style="color:#1e1b4b;">2.0 Architectural Mapping</h4>
                        <p>Detailed mapping of the attention-head mechanisms shows a 14% increase in processing efficiency when using the APEX-LMS optimization plugin...</p>
                    </div>
                </div>
            `;
        } else if (type === 'lab') {
            content = `
                <div style="background:#0f172a; border-radius:12px; padding:30px; font-family:monospace; color:#34d399; min-height:400px; border:2px solid #1e293b; box-shadow: inset 0 0 50px rgba(0,0,0,0.5);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #1e293b; padding-bottom:10px;">
                        <span>Terminal: ~/${assetName.toLowerCase()}</span>
                        <span style="color:#64748b;">STATUS: CONNECTION_LIVE</span>
                    </div>
                    <div style="font-size:0.9rem;">
                        <p>> Initializing Neural Sandbox v4.2.1...</p>
                        <p>> [OK] Mapping local memory clusters</p>
                        <p>> [OK] Securing I/O tunneling</p>
                        <p>> [OK] Injecting training weights</p>
                        <p style="color:white; font-weight:800; margin-top:20px;">Ready for command.</p>
                        <div style="display:flex; align-items:center; margin-top:10px;">
                            <span style="color:#a3e635; margin-right:10px;">admin@apex:~$</span>
                            <span style="width:10px; height:18px; background:#a3e635; animation: blink 1s step-end infinite;"></span>
                        </div>
                    </div>
                    <style>@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }</style>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content animate-pop-in" style="max-width:900px; width:95%; background:white; padding:4px; border-radius:16px; position:relative; box-shadow:0 0 100px rgba(0,0,0,0.5);">
                <button style="position:absolute; top:-20px; right:-20px; width:40px; height:40px; border-radius:50%; background:#ef4444; color:white; border:none; font-weight:800; cursor:pointer; font-size:1.2rem; box-shadow:0 10px 20px rgba(239, 68, 68, 0.3);" onclick="this.closest('.modal-overlay').remove()">×</button>
                <div style="padding:10px; background:#f8fafc; border-bottom:1px solid #e2e8f0; border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.8rem; font-weight:800; color:#1e1b4b; text-transform:uppercase;">Asset Preview Mode</span>
                    <span style="font-size:0.75rem; color:#64748b;">${assetName}</span>
                </div>
                <div style="padding:20px;">
                    ${content}
                </div>
            </div>
        `;

        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '9999'
        });

        document.body.appendChild(modal);
    },

    openInventoryDrawer(action, assetName = '') {
        const drawer = document.createElement('div');
        drawer.className = 'modal-overlay animate-fade-in';
        
        let title = '';
        let content = '';
        let accentColor = 'var(--color-admin-secondary)';

        switch(action) {
            case 'register':
                title = 'Register New Curriculum Asset';
                content = `
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Asset Title</label>
                        <input type="text" style="width:100%; padding:12px 16px; border-radius:10px; border:1px solid var(--color-admin-border); font-size:0.9rem; font-family:inherit; outline:none; transition:border-color 0.2s;" placeholder="e.g. Advanced Vector Scaling" onfocus="this.style.borderColor='var(--color-admin-secondary)'" onblur="this.style.borderColor='var(--color-admin-border)'">
                    </div>
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Primary Category</label>
                        <select style="width:100%; padding:12px 16px; border-radius:10px; border:1px solid var(--color-admin-border); font-size:0.9rem; font-family:inherit; outline:none; appearance:none; background:white; background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%224 6 8 10 12 6%22/></svg>'); background-repeat: no-repeat; background-position: right 12px center;">
                            <option>AI & Data Science</option>
                            <option>Zero-Trust Cybersecurity</option>
                            <option>Enterprise Engineering</option>
                            <option>Macro Management</option>
                        </select>
                    </div>
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:12px;">Infrastructure Provisioning</label>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                            <button class="btn btn-outline" style="font-size:0.75rem; border-radius:10px; padding:12px;" onclick="APEX_SYSTEM.notify('AWS Cluster Provisioning Ready', 'info')">AWS Cluster</button>
                            <button class="btn btn-outline" style="font-size:0.75rem; border-radius:10px; padding:12px;" onclick="APEX_SYSTEM.notify('GCP Node Provisioning Ready', 'info')">GCP Node</button>
                        </div>
                    </div>
                `;
                break;
            case 'manage':
                title = `Manage: ${assetName}`;
                content = `
                    <div style="background:rgba(6,182,212,0.05); padding:20px; border-radius:12px; margin-bottom:24px; border-left:4px solid var(--color-admin-secondary);">
                        <div style="font-size:0.65rem; font-weight:900; color:var(--color-admin-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">LATEST NODE AUDIT</div>
                        <div style="font-size:0.9rem; color:var(--color-admin-primary); font-weight:500;">Version 4.2.1 synchronized with Acme-North cluster. All nodes healthy.</div>
                    </div>
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Enrollment Capacity</label>
                        <input type="number" style="width:100%; padding:12px 16px; border-radius:10px; border:1px solid var(--color-admin-border); font-size:0.9rem; font-family:inherit; outline:none;" value="500">
                    </div>
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:12px;">Sync Status Override</label>
                        <div class="flex gap-sm">
                            <span class="status-pill status-live" style="cursor:pointer; flex:1; text-align:center;">Live</span>
                            <span class="status-pill status-draft" style="cursor:pointer; flex:1; text-align:center; opacity:0.4;">Draft</span>
                        </div>
                    </div>
                `;
                break;
            case 'build':
                title = `Build Pipeline: ${assetName}`;
                accentColor = 'var(--color-admin-accent)';
                content = `
                    <div style="background:#1e1b4b; color:white; padding:20px; border-radius:12px; font-family:monospace; font-size:0.8rem; margin-bottom:20px;">
                        <p style="color:#a3e635;">> Initializing build sequence...</p>
                        <p>> Fetching source modules: [OK]</p>
                        <p>> Compiling neural weights: [OK]</p>
                        <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin:10px 0;">
                            <div style="width:65%; height:100%; background:#a3e635; border-radius:2px;"></div>
                        </div>
                        <p style="text-align:right;">65% Complete</p>
                    </div>
                    <button class="btn btn-primary" style="width:100%; background:var(--color-admin-accent); color:var(--color-admin-primary);" onclick="APEX_SYSTEM.notify('Build Successfully Committed', 'success')">Deploy to Staging</button>
                `;
                break;
            case 'restore':
                title = `Recovery Archive: ${assetName}`;
                accentColor = '#64748b';
                content = `
                    <div style="text-align:center; padding:20px;">
                        <div style="font-size:3rem; margin-bottom:15px;">💾</div>
                        <p style="font-size:0.9rem; color:var(--color-admin-muted);">This asset was archived on **Jan 14, 2025**. Restoring will re-provision all associated cloud nodes.</p>
                    </div>
                `;
                break;
        }

        drawer.innerHTML = `
            <div class="modal-content animate-slide-in-right" style="position:fixed; top:0; right:0; width:min(500px, 100%); height:100vh; background:white; padding:0; border-radius:0; box-shadow:-20px 0 60px rgba(0,0,0,0.15); display:flex; flex-direction:column; overflow:hidden;">
                <div style="padding:40px 30px; background:var(--color-admin-primary); color:white; position:relative;">
                    <button style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.4rem; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" onclick="this.closest('.modal-overlay').remove()">×</button>
                    <div style="font-size:0.75rem; font-weight:900; color:${accentColor}; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px;">Inventory Engine Dashboard</div>
                    <h2 style="margin:0; font-size:1.7rem; letter-spacing:-0.5px; line-height:1.2; color:white;">${title}</h2>
                </div>
                <div style="padding:30px; flex:1; overflow-y:auto; background:var(--color-admin-bg);">
                    <div style="background:white; padding:30px; border-radius:16px; border:1px solid var(--color-admin-border); box-shadow:0 4px 12px rgba(0,0,0,0.02);">
                        ${content}
                    </div>
                    
                    <div style="margin-top:30px;">
                        <button class="btn btn-primary" style="width:100%; padding:16px; font-weight:800; font-size:1rem; border-radius:12px; box-shadow:0 10px 20px rgba(30, 27, 75, 0.2);" onclick="APEX_SYSTEM.notify('Changes Synchronized Across Active Clusters', 'success'); this.closest('.modal-overlay').remove()">Commit Manifest Changes</button>
                        <button class="btn btn-outline" style="width:100%; margin-top:14px; padding:14px; border-radius:12px; background:white; font-weight:700;" onclick="this.closest('.modal-overlay').remove()">Abort Action</button>
                    </div>
                </div>
            </div>
            <style>
                .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            </style>
        `;

        Object.assign(drawer.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
            zIndex: '9999'
        });

        document.body.appendChild(drawer);
    },

    openCohortDrawer(action, cohortName = '') {
        const drawer = document.createElement('div');
        drawer.className = 'modal-overlay animate-fade-in';
        
        let title = '';
        let content = '';
        let accentColor = 'var(--color-admin-accent)';

        if(action === 'provision') {
            title = 'Provision New Global Cohort';
            content = `
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Cohort Namespace</label>
                    <input type="text" style="width:100%; padding:12px 16px; border-radius:10px; border:1px solid var(--color-admin-border); font-size:0.9rem;" placeholder="e.g. Sales-Engineering-Q3">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Access Logic</label>
                    <select style="width:100%; padding:12px 16px; border-radius:10px; border:1px solid var(--color-admin-border);">
                        <option>Direct Assignment</option>
                        <option>Role-Based Auto-Sync</option>
                        <option>Tenant Self-Signup</option>
                    </select>
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:12px;">Resource Allocation</label>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div style="background:#f1f5f9; padding:12px; border-radius:10px; text-align:center;">
                            <div style="font-size:0.6rem; font-weight:800; color:var(--color-admin-muted);">STORAGE</div>
                            <div style="font-size:1rem; font-weight:800;">500GB</div>
                        </div>
                        <div style="background:#f1f5f9; padding:12px; border-radius:10px; text-align:center;">
                            <div style="font-size:0.6rem; font-weight:800; color:var(--color-admin-muted);">COMPUTE</div>
                            <div style="font-size:1rem; font-weight:800;">8 vCPU</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            title = `Drill Down: ${cohortName}`;
            accentColor = 'var(--color-admin-secondary)';
            content = `
                <div style="background:rgba(6,182,212,0.05); padding:20px; border-radius:12px; margin-bottom:24px;">
                    <h4 style="margin:0 0 10px 0; font-size:0.95rem;">Engagement Overclock</h4>
                    <div style="height:8px; background:rgba(0,0,0,0.05); border-radius:4px; overflow:hidden;">
                        <div style="width:92%; height:100%; background:var(--color-admin-secondary);"></div>
                    </div>
                    <p style="font-size:0.8rem; color:var(--color-admin-muted); margin-top:8px;">92% of users active in the last 24h. 3 users flagged for high-risk turnover.</p>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px;">
                    <button class="btn btn-outline" style="font-size:0.75rem;">Export Audit</button>
                    <button class="btn btn-outline" style="font-size:0.75rem;">Reset Logic</button>
                </div>
            `;
        }

        drawer.innerHTML = `
            <div class="modal-content animate-slide-in-right" style="position:fixed; top:0; right:0; width:min(500px, 100%); height:100vh; background:white; padding:0; border-radius:0; box-shadow:-20px 0 60px rgba(0,0,0,0.15); display:flex; flex-direction:column; overflow:hidden;">
                <div style="padding:40px 30px; background:var(--color-admin-primary); color:white; position:relative;">
                    <button style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.4rem;" onclick="this.closest('.modal-overlay').remove()">×</button>
                    <div style="font-size:0.75rem; font-weight:900; color:${accentColor}; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px;">Cohort Intelligence</div>
                    <h2 style="margin:0; font-size:1.7rem; color:white;">${title}</h2>
                </div>
                <div style="padding:30px; flex:1; overflow-y:auto; background:var(--color-admin-bg);">
                    <div style="background:white; padding:30px; border-radius:16px; border:1px solid var(--color-admin-border);">
                        ${content}
                    </div>
                    <div style="margin-top:30px;">
                        <button class="btn btn-primary" style="width:100%; padding:16px; font-weight:800; border-radius:12px;" onclick="APEX_SYSTEM.notify('Cohort configuration synchronized', 'success'); this.closest('.modal-overlay').remove()">Synchronize State</button>
                        <button class="btn btn-outline" style="width:100%; margin-top:14px; padding:14px; border-radius:12px; background:white;" onclick="this.closest('.modal-overlay').remove()">Abort</button>
                    </div>
                </div>
            </div>
            <style>
                .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            </style>
        `;

        Object.assign(drawer.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
            zIndex: '9999'
        });
        document.body.appendChild(drawer);
    },

    initEngagementMatrix() {
        const matrix = document.getElementById('engagement-matrix');
        if(!matrix) return;

        const boxes = matrix.querySelectorAll('.matrix-box');
        
        // Live Heartbeat Simulation
        setInterval(() => {
            const randomBox = boxes[Math.floor(Math.random() * boxes.length)];
            randomBox.style.filter = 'brightness(1.5)';
            randomBox.style.transform = 'scale(1.1)';
            setTimeout(() => {
                randomBox.style.filter = '';
                randomBox.style.transform = '';
            }, 800);
        }, 3000);

        boxes.forEach(box => {
            box.style.cursor = 'pointer';
            box.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            box.addEventListener('mouseenter', () => {
                box.style.transform = 'scale(1.2) rotate(5deg)';
                box.style.zIndex = '10';
                box.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.4)';
                
                const val = Math.floor(Math.random() * 100);
                const tooltip = document.createElement('div');
                tooltip.className = 'matrix-tooltip';
                tooltip.innerHTML = `<strong>Cluster Optix: ${val}%</strong><br><small>Signal: ${val > 70 ? 'CRITICAL' : 'OPTIMAL'}</small>`;
                Object.assign(tooltip.style, {
                    position: 'absolute', top: '-55px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--color-admin-primary)', color: 'white', padding: '10px 14px',
                    borderRadius: '8px', fontSize: '0.7rem', whiteSpace: 'nowrap', zIndex: '100',
                    pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                });
                box.appendChild(tooltip);
            });

            box.addEventListener('mouseleave', () => {
                box.style.transform = '';
                box.style.zIndex = '';
                box.style.boxShadow = '';
                const tooltip = box.querySelector('.matrix-tooltip');
                if(tooltip) tooltip.remove();
            });

            box.addEventListener('click', () => {
                this.openClusterDiagnostic(box);
            });
        });
    },

    openClusterDiagnostic(sourceBox) {
        const drawer = document.createElement('div');
        drawer.className = 'modal-overlay animate-fade-in';
        
        const clusterId = Math.floor(Math.random() * 9999);
        const health = Math.floor(Math.random() * 20) + 80; // 80-100%

        drawer.innerHTML = `
            <div class="modal-content animate-slide-in-right" style="position:fixed; top:0; right:0; width:min(450px, 100%); height:100vh; background:white; padding:0; display:flex; flex-direction:column; box-shadow:-20px 0 60px rgba(0,0,0,0.2);">
                <div style="padding:40px 30px; background:var(--color-admin-primary); color:white;">
                    <button style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:50%; cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">×</button>
                    <div style="font-size:0.7rem; font-weight:900; color:var(--color-admin-accent); text-transform:uppercase; letter-spacing:2px; margin-bottom:10px;">Infrastructure Probe</div>
                    <h2 style="margin:0; font-size:1.6rem;">Cluster Diagnostic: #PX-${clusterId}</h2>
                </div>
                <div style="padding:30px; flex:1; overflow-y:auto; background:var(--color-admin-bg);">
                    <div style="background:white; padding:25px; border-radius:16px; border:1px solid var(--color-admin-border); margin-bottom:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <span style="font-weight:700;">Cluster Integrity</span>
                            <span style="color:var(--color-success); font-weight:800;">${health}% Healthy</span>
                        </div>
                        <div style="height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden;">
                            <div style="width:${health}%; height:100%; background:var(--color-success);"></div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                        <div style="background:white; padding:15px; border-radius:12px; border:1px solid var(--color-admin-border);">
                            <div style="font-size:0.6rem; color:var(--color-admin-muted); font-weight:800; text-transform:uppercase;">Throughput</div>
                            <div style="font-size:1.2rem; font-weight:800;">2.4 GB/s</div>
                        </div>
                        <div style="background:white; padding:15px; border-radius:12px; border:1px solid var(--color-admin-border);">
                            <div style="font-size:0.6rem; color:var(--color-admin-muted); font-weight:800; text-transform:uppercase;">Active Nodes</div>
                            <div style="font-size:1.2rem; font-weight:800;">14 / 16</div>
                        </div>
                    </div>

                    <div style="margin-top:30px; background:rgba(6,182,212,0.05); padding:20px; border-radius:16px; border:1px dashed var(--color-admin-secondary);">
                        <h4 style="margin:0 0 10px 0; font-size:0.9rem;">Intelligence Feed</h4>
                        <div style="font-size:0.8rem; color:var(--color-admin-text); line-height:1.6;">
                            • Neural sync stabilized in AWS-East-1<br>
                            • Cache hit ratio 98.2%<br>
                            • Redundant power backup active
                        </div>
                    </div>

                    <button class="btn btn-premium" style="width:100%; margin-top:30px; padding:16px;" onclick="APEX_SYSTEM.notify('Cluster #PX-${clusterId} re-balanced successfully', 'success'); this.closest('.modal-overlay').remove()">Re-Balance Cluster</button>
                </div>
            </div>
        `;

        Object.assign(drawer.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: '9999'
        });

        document.body.appendChild(drawer);
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="toast-icon">${type === 'success' ? '✓' : 'ℹ'}</span>
                <span class="toast-msg">${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        Object.assign(toast.style, {
            position: 'fixed', bottom: '30px', right: '30px',
            background: type === 'success' ? '#10b981' : '#1e1b4b',
            color: 'white', padding: '12px 24px', borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: '5000',
            transform: 'translateY(100px)', transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontWeight: '600', fontSize: '0.9rem'
        });

        setTimeout(() => toast.style.transform = 'translateY(0)', 100);
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    openSupportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="background:white; padding:30px; border-radius:16px; max-width:500px; width:90%; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); transform:scale(0.9); transition:transform 0.3s ease;">
                <h3 style="margin-top:0; color:#1e1b4b;">Submit Tech Support Ticket</h3>
                <p style="color:#64748b; font-size:0.9rem; margin-bottom:20px;">Reference Ticket ID: #APEX-${Math.floor(Math.random() * 10000)}</p>
                <textarea placeholder="Describe your technical issue..." style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:20px; font-family:inherit; min-height:100px;"></textarea>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn btn-outline" style="padding:8px 16px;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Cancel</button>
                    <button class="btn btn-secondary" style="padding:8px 16px;" onclick="APEX_SYSTEM.showToast('Ticket submitted successfully!'); document.body.removeChild(this.closest('.modal-overlay'))">Submit Ticket</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '4000'
        });

        setTimeout(() => modal.firstElementChild.style.transform = 'scale(1)', 10);
    },

    openCourseOverview(courseTitle) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="background:white; padding:40px; border-radius:24px; max-width:650px; width:95%; box-shadow:0 30px 60px -12px rgba(0,0,0,0.5); transform:translateY(20px); transition:all 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px;">
                    <div>
                        <span style="background:#fef3c7; color:#b45309; padding:4px 12px; border-radius:20px; font-size:0.7rem; font-weight:800; text-transform:uppercase;">New Program</span>
                        <h2 style="margin:10px 0 5px; color:#1e1b4b; font-size:2rem;">${courseTitle}</h2>
                        <p style="color:#64748b; font-size:1rem;">Master the art of high-stakes enterprise negotiations.</p>
                    </div>
                </div>
                <div style="background:#f8fafc; padding:20px; border-radius:16px; margin-bottom:30px;">
                    <h4 style="margin:0 0 10px; font-size:0.9rem;">Syllabus Preview</h4>
                    <ul style="margin:0; padding:0; list-style:none; font-size:0.85rem; color:#475569;">
                        <li style="margin-bottom:8px;">• Psychology of Enterprise Procurement</li>
                        <li style="margin-bottom:8px;">• Value-Based Selling Frameworks</li>
                        <li style="margin-bottom:8px;">• Handling Objection Patterns (AI Roleplay)</li>
                        <li>• Final Certification: Strategic Closing</li>
                    </ul>
                </div>
                <div style="display:flex; gap:15px; justify-content:flex-end;">
                    <button class="btn btn-outline" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Later</button>
                    <button class="btn btn-secondary" style="padding:12px 30px;" onclick="APEX_SYSTEM.showToast('Enrolled in ${courseTitle}!'); window.location.href='course-player.html'">Enroll & Start Path</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '5000'
        });
        setTimeout(() => {
            modal.firstElementChild.style.transform = 'translateY(0)';
            modal.firstElementChild.style.opacity = '1';
        }, 10);
    },

    openSyllabusDrawer(courseTitle) {
        const drawer = document.createElement('div');
        drawer.className = 'syllabus-drawer';
        drawer.innerHTML = `
            <div class="drawer-content" style="position:fixed; top:0; right:0; height:100%; width:400px; background:white; z-index:6000; box-shadow:-10px 0 50px rgba(0,0,0,0.2); transform:translateX(100%); transition:transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); padding:40px; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                    <h3 style="margin:0; color:#1e1b4b;">${courseTitle}</h3>
                    <button style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;" onclick="this.closest('.syllabus-drawer').remove()">×</button>
                </div>
                <div style="flex:1; overflow-y:auto;">
                    <div style="margin-bottom:25px;">
                        <span style="font-size:0.75rem; font-weight:800; color:#94a3b8; text-transform:uppercase;">Module 1: Fundamentals</span>
                        <div style="margin-top:15px; display:flex; flex-direction:column; gap:15px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px; border-radius:10px;">
                                <span style="font-size:0.85rem; font-weight:600;">Course Introduction</span>
                                <span style="color:#10b981;">✓</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; background:#f0f9ff; border:1px solid #bae6fd; padding:12px; border-radius:10px; cursor:pointer;" onclick="window.location.href='course-player.html'">
                                <span style="font-size:0.85rem; font-weight:700; color:#0369a1;">Live Lab: Scenario Analysis</span>
                                <span style="font-size:0.7rem; background:#0ea5e9; color:white; padding:2px 6px; border-radius:4px;">START</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" style="margin-top:20px;" onclick="window.location.href='course-player.html'">Resume Full Course</button>
            </div>
            <div class="drawer-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); z-index:5500; opacity:0; transition:opacity 0.4s ease;" onclick="this.closest('.syllabus-drawer').remove()"></div>
        `;
        document.body.appendChild(drawer);
        setTimeout(() => {
            drawer.querySelector('.drawer-content').style.transform = 'translateX(0)';
            drawer.querySelector('.drawer-overlay').style.opacity = '1';
        }, 10);
    },

    openQuestionDrawer() {
        const drawer = document.createElement('div');
        drawer.className = 'modal-overlay animate-fade-in';
        drawer.innerHTML = `
            <div class="modal-content animate-slide-in-right" style="position:fixed; top:0; right:0; width:min(500px, 100%); height:100vh; background:white; padding:0; display:flex; flex-direction:column; box-shadow:-20px 0 60px rgba(0,0,0,0.2);">
                <div style="padding:40px 30px; background:var(--color-admin-primary); color:white;">
                    <button style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:50%; cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">×</button>
                    <div style="font-size:0.75rem; font-weight:900; color:var(--color-admin-secondary); text-transform:uppercase; letter-spacing:2px; margin-bottom:12px;">Question Intelligence Studio</div>
                    <h2 style="margin:0; font-size:1.7rem;">Create New Matrix Item</h2>
                </div>
                <div style="padding:30px; flex:1; overflow-y:auto; background:var(--color-admin-bg);">
                    <form id="new-question-form">
                        <div style="background:white; padding:25px; border-radius:16px; border:1px solid var(--color-admin-border); margin-bottom:20px;">
                            <div style="margin-bottom:20px;">
                                <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Question Text</label>
                                <textarea id="q-text" required style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--color-admin-border); font-family:inherit; font-size:0.95rem; min-height:100px;" placeholder="Enter the assessment challenge..."></textarea>
                            </div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
                                <div>
                                    <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Complexity</label>
                                    <select id="q-diff" style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--color-admin-border); font-size:0.9rem;">
                                        <option value="med">Intermediate</option>
                                        <option value="easy">Foundational</option>
                                        <option value="hard">Advanced</option>
                                        <option value="expert">Expert Logic</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Namespace</label>
                                    <input type="text" id="q-tags" placeholder="e.g. SECURITY, AI" style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--color-admin-border); font-size:0.9rem;">
                                </div>
                            </div>

                            <div style="margin-bottom:10px;">
                                <label style="display:block; font-size:0.75rem; font-weight:800; color:var(--color-admin-muted); text-transform:uppercase; margin-bottom:8px;">Curriculum Linking</label>
                                <select id="q-link" style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--color-admin-border); font-size:0.9rem;">
                                    <option>SecOps Masterclass</option>
                                    <option>Infra Sentinels</option>
                                    <option>Neural Orchestration</option>
                                    <option>Strategic Mastery</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-premium" style="width:100%; padding:18px; border-radius:14px;">Deploy to Repository</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(drawer);

        drawer.querySelector('#new-question-form').onsubmit = (e) => {
            e.preventDefault();
            this.addQuestionToLibrary();
            drawer.remove();
        };
    },

    addQuestionToLibrary() {
        const grid = document.getElementById('question-grid');
        if(!grid) return;

        const text = document.getElementById('q-text').value;
        const diff = document.getElementById('q-diff').value;
        const tags = document.getElementById('q-tags').value.split(',').map(t => t.trim().toUpperCase());
        const link = document.getElementById('q-link').value;
        const id = 'Q-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const diffLabel = {
            'easy': 'Foundational',
            'med': 'Intermediate',
            'hard': 'Advanced',
            'expert': 'Expert Logic'
        }[diff];

        const card = document.createElement('div');
        card.className = 'col-span-4 question-card animate-fade-in-up';
        card.innerHTML = `
            <div class="difficulty-indicator diff-${diff}">${diffLabel}</div>
            <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-admin-muted); margin-bottom: 12px;">#${id}</div>
            <div style="font-weight: 800; font-size: 1rem; color: var(--color-admin-primary); line-height: 1.4; margin-bottom: 20px;">
                ${text}
            </div>
            <div class="flex gap-sm" style="flex-wrap: wrap;">
                ${tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
            </div>
            <div style="margin-top:20px; font-size: 0.75rem; color: var(--color-admin-muted); border-top:1px solid #f1f5f9; padding-top:15px;">
                Linked to: <strong>${link}</strong>
            </div>
        `;

        grid.insertBefore(card, grid.firstChild);
        this.notify('New Intelligence Item Deployed Successfully', 'success');
    }
};

// Boot system
document.addEventListener('DOMContentLoaded', () => {
    APEX_SYSTEM.init();
});
