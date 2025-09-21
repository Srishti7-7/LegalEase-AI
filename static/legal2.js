 document.addEventListener('DOMContentLoaded', () => {
    
    // --- APPLICATION STATE ---
    let currentDocumentText = null;
    let currentFileName = null;
    const API_BASE_URL = 'http://127.0.0.1:5001/api';

    // --- DOM ELEMENT SELECTORS ---
    const getEl = (id) => document.getElementById(id);
    const elements = {
        uploadArea: getEl('uploadArea'),
        fileInput: getEl('fileInput'),
        simplifyLoading: getEl('simplifyLoading'),
        simplifyResults: getEl('simplifyResults'),
        simplifiedContent: getEl('simplifiedContent'),
        resetButton: getEl('resetButton'),
        conceptSearchInput: getEl('conceptSearch'),
        conceptLanguageSelector: getEl('conceptLanguageSelector'),
        searchConceptButton: getEl('searchConceptButton'),
        conceptLoading: getEl('conceptLoading'),
        conceptResults: getEl('conceptResults'),
        runPredictionButton: getEl('runPredictionButton'),
        predictLoading: getEl('predictLoading'),
        predictionOutcome: getEl('predictionOutcome'),
        predictResults: getEl('predictResults'),
        termSearchInput: getEl('termSearch'),
        dictionaryLanguageSelector: getEl('dictionaryLanguageSelector'),
        searchTermButton: getEl('searchTermButton'),
        dictionaryResults: getEl('dictionaryResults'),
        timelineSearchInput: getEl('timelineSearch'),
        searchTimelineButton: getEl('searchTimelineButton'),
        timelineLoading: getEl('timelineLoading'),
        timelineContainer: getEl('timelineContainer'),
        actsSearchInput: getEl('actsSearchInput'),
        actsSearchButton: getEl('actsSearchButton'),
        actsLoading: getEl('actsLoading'),
        actsResults: getEl('actsResults'),
        chatInput: getEl('chatInput'),
        sendChatButton: getEl('sendChatButton'),
        chatMessages: getEl('chatMessages'),
        chatStatus: getEl('chatStatus'),
        historyList: getEl('historyList'),
        mobileMenuButton: getEl('mobile-menu-button'),
        mobileMenu: getEl('mobile-menu'),
        contactSubmit: getEl('contactSubmit'),
        openChatButton: getEl('open-chat-button'),
        chatModal: getEl('chat-modal'),
        closeChatModal: getEl('close-chat-modal'),
        generalChatMessages: getEl('general-chat-messages'),
        generalChatInput: getEl('general-chat-input'),
        generalChatSend: getEl('general-chat-send'),
    };

    // --- INITIALIZATION ---
    const initializeApp = () => {
        lucide.createIcons();
        setupEventListeners();
        loadHistory();
    };

    // --- EVENT LISTENERS SETUP ---
    const setupEventListeners = () => {
        document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', handlePageNavigation));
        elements.mobileMenuButton.addEventListener('click', () => elements.mobileMenu.classList.toggle('hidden'));
        document.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
        
        elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            elements.uploadArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => elements.uploadArea.addEventListener(eventName, () => elements.uploadArea.classList.add('border-pink-400', 'bg-violet-500/10')));
        ['dragleave', 'drop'].forEach(eventName => elements.uploadArea.addEventListener(eventName, () => elements.uploadArea.classList.remove('border-pink-400', 'bg-violet-500/10')));
        elements.uploadArea.addEventListener('drop', (e) => handleFileUpload(e.dataTransfer.files[0]));
        elements.fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

        elements.searchConceptButton.addEventListener('click', searchConcept);
        elements.conceptSearchInput.addEventListener('keypress', e => e.key === 'Enter' && searchConcept());
        elements.runPredictionButton.addEventListener('click', runPredictionAnalysis);
        elements.searchTermButton.addEventListener('click', searchTerm);
        elements.termSearchInput.addEventListener('keypress', e => e.key === 'Enter' && searchTerm());
        elements.searchTimelineButton.addEventListener('click', searchTimeline);
        elements.timelineSearchInput.addEventListener('keypress', e => e.key === 'Enter' && searchTimeline());
        elements.actsSearchButton.addEventListener('click', searchActsAndRules);
        elements.actsSearchInput.addEventListener('keypress', e => e.key === 'Enter' && searchActsAndRules());
        elements.sendChatButton.addEventListener('click', sendMessage);
        elements.chatInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());
        elements.resetButton.addEventListener('click', resetAppForNewFile);

        document.querySelectorAll('.common-search-btn').forEach(button => {
            button.addEventListener('click', () => {
                // First, navigate to the "Acts & Rules" page
                handlePageNavigation({ preventDefault: () => {}, currentTarget: { dataset: { page: 'acts' } } });
                // Then, populate the search and run it
                elements.actsSearchInput.value = button.textContent;
                searchActsAndRules();
            });
        });
        
        elements.contactSubmit?.addEventListener('click', e => {
            e.preventDefault();
            showNotification('Thank you for your message!', 'success');
            e.target.closest('form').reset();
        });

        elements.openChatButton?.addEventListener('click', toggleChatModal);
        elements.closeChatModal?.addEventListener('click', toggleChatModal);
        elements.generalChatSend?.addEventListener('click', sendGeneralMessage);
        elements.generalChatInput?.addEventListener('keypress', e => e.key === 'Enter' && sendGeneralMessage());
    };

    // --- CORE API CALL FUNCTION ---
    const apiCall = async (endpoint, options) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            showNotification(error.message, 'error');
            throw error;
        }
    };
    
    // --- FEATURE IMPLEMENTATIONS ---
    const searchActsAndRules = async () => {
        const query = elements.actsSearchInput.value.trim();
        if (!query) {
            showNotification('Please enter an act, rule, or section to search.', 'warning');
            return;
        }
        
        elements.actsLoading.classList.remove('hidden');
        elements.actsResults.innerHTML = '';

        try {
            const result = await apiCall('acts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const explanationCard = `
                <div class="glass-card p-6 rounded-lg animate-fade-in mt-6">
                    <p class="text-violet-200 leading-relaxed whitespace-pre-wrap">${result.explanation.replace(/\n/g, '<br>')}</p>
                </div>`;
            elements.actsResults.innerHTML = explanationCard;
        } catch (error) {
            elements.actsResults.innerHTML = `<p class="text-red-400">Could not find information for "${query}". Please try again.</p>`;
        } finally {
            elements.actsLoading.classList.add('hidden');
        }
    };

    const handleFileUpload = async (file) => {
        if (!file) return;
        elements.uploadArea.classList.add('hidden');
        elements.simplifyLoading.classList.remove('hidden');
        elements.simplifyResults.classList.add('hidden');
        const formData = new FormData();
        formData.append('document', file);
        try {
            const result = await apiCall('simplify', { method: 'POST', body: formData });
            currentDocumentText = result.summary;
            currentFileName = file.name;
            displaySimplifiedContent(result.summary, result.definitions);
            elements.simplifyResults.classList.remove('hidden');
            const docUploadMessage = "Your document has been analyzed. You can now use 'Outcome Analysis' or ask specific questions about the text in the chat.";
            addBotMessage(docUploadMessage);
            elements.chatStatus.textContent = `Analyzing: ${currentFileName}`;
            updateHistory(currentFileName);
            showNotification('Document simplified successfully!', 'success');
        } catch (error) {
            elements.uploadArea.classList.remove('hidden');
        } finally {
            elements.simplifyLoading.classList.add('hidden');
        }
    };
    
    const displaySimplifiedContent = (summary, definitions) => {
        let highlightedSummary = summary;
        for (const term in definitions) {
            const regex = new RegExp(`\\b(${term})\\b`, 'gi');
            highlightedSummary = highlightedSummary.replace(regex, (match) => 
                `<span class="legal-term-highlight" data-tooltip="${definitions[term]}">${match}</span>`
            );
        }
        elements.simplifiedContent.innerHTML = highlightedSummary;
        setupTooltips();
    };
    
    const setupTooltips = () => {
        document.querySelectorAll('.legal-term-highlight').forEach(term => {
            const tooltipText = document.createElement('span');
            tooltipText.className = 'tooltip-text';
            tooltipText.textContent = term.dataset.tooltip;
            term.appendChild(tooltipText);
        });
    };

    const searchConcept = async () => {
        const concept = elements.conceptSearchInput.value.trim();
        const language = elements.conceptLanguageSelector.value;
        if (!concept) {
            showNotification('Please enter a concept to explain.', 'warning');
            return;
        }
        elements.conceptLoading.classList.remove('hidden');
        elements.conceptResults.innerHTML = '';
        try {
            const result = await apiCall('explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ concept, language })
            });
            const explanationCard = `<div class="glass-card p-6 rounded-lg animate-fade-in"><h4 class="font-bold text-pink-400 text-xl mb-3">${concept.charAt(0).toUpperCase() + concept.slice(1)}</h4><p class="text-violet-200 leading-relaxed whitespace-pre-wrap">${result.explanation}</p></div>`;
            elements.conceptResults.innerHTML = explanationCard;
        } catch (error) {
            elements.conceptResults.innerHTML = `<p class="text-red-400">Could not generate an explanation. Please try again.</p>`;
        } finally {
            elements.conceptLoading.classList.add('hidden');
        }
    };

    const runPredictionAnalysis = async () => {
        if (!currentDocumentText) {
            showNotification('Please upload and simplify a document first.', 'warning');
            return;
        }
        elements.predictLoading.classList.remove('hidden');
        elements.predictResults.innerHTML = '';
        elements.predictResults.classList.add('hidden');
        elements.predictionOutcome.innerHTML = '';
        elements.predictionOutcome.classList.add('hidden');

        try {
            const result = await apiCall('predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: currentDocumentText })
            });

            if (result.prediction && result.prediction.outcome) {
                const outcomeColor = result.prediction.outcome.toLowerCase().includes('win') ? 'green' : result.prediction.outcome.toLowerCase().includes('lose') ? 'red' : 'orange';
                const outcomeIcon = result.prediction.outcome.toLowerCase().includes('win') ? 'thumbs-up' : result.prediction.outcome.toLowerCase().includes('lose') ? 'thumbs-down' : 'help-circle';
                
                const predictionCard = `<h4 class="text-xl font-bold text-white mb-2">Predicted Outcome</h4><div class="glass-card p-4 rounded-lg border-l-4 border-${outcomeColor}-500"><h5 class="font-bold text-white text-lg flex items-center gap-2"><i data-lucide="${outcomeIcon}" class="w-5 h-5"></i>${result.prediction.outcome}</h5><p class="text-violet-200 mt-2">${result.prediction.reasoning}</p></div>`;
                elements.predictionOutcome.innerHTML = predictionCard;
                elements.predictionOutcome.classList.remove('hidden');
            }

            elements.predictResults.innerHTML += `<h4 class="text-xl font-bold text-white mb-2 mt-6">Potential Risks</h4>`;
            if (result.risks && result.risks.length > 0) {
                result.risks.forEach(item => {
                    const icon = item.severity.toLowerCase() === 'high' ? 'shield-alert' : item.severity.toLowerCase() === 'medium' ? 'shield-half' : 'shield-check';
                    const riskCard = `<div class="glass-card p-4 rounded-lg border-l-4 border-${item.severity.toLowerCase() === 'high' ? 'red' : item.severity.toLowerCase() === 'medium' ? 'orange' : 'green'}-500"><h5 class="font-bold text-white flex items-center gap-2"><i data-lucide="${icon}" class="w-5 h-5"></i> ${item.severity} Risk</h5><p class="text-violet-200 mt-1">${item.risk}</p><p class="text-xs text-violet-400 mt-2 font-mono bg-black/20 p-2 rounded">Clause: "${item.clause}"</p></div>`;
                    elements.predictResults.innerHTML += riskCard;
                });
            } else {
                elements.predictResults.innerHTML += `<p class="text-green-300">No significant risks found in the document.</p>`;
            }
            lucide.createIcons();
        } catch (error) {
            elements.predictResults.innerHTML = `<p class="text-red-400">Could not run analysis. Please try again.</p>`;
        } finally {
            elements.predictLoading.classList.add('hidden');
            elements.predictResults.classList.remove('hidden');
        }
    };

    const searchTerm = async () => {
        const term = elements.termSearchInput.value.trim();
        const language = elements.dictionaryLanguageSelector.value;
        if (!term) return;
        elements.dictionaryResults.innerHTML = `<p class="text-violet-300">Searching...</p>`;
        try {
            const result = await apiCall('dictionary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term, language })
            });
            const definitionCard = `<div class="glass-card p-4 rounded-lg animate-fade-in"><h5 class="font-bold text-pink-400 text-lg">${term}</h5><p class="text-violet-200 mt-1">${result.definition}</p></div>`;
            elements.dictionaryResults.innerHTML = definitionCard;
        } catch (error) {
            elements.dictionaryResults.innerHTML = `<p class="text-red-400">Could not find a definition for "${term}".</p>`;
        }
    };
    
    const searchTimeline = async () => {
        const concept = elements.timelineSearchInput.value.trim();
        if (!concept) return;
        elements.timelineLoading.classList.remove('hidden');
        elements.timelineContainer.classList.add('hidden');
        elements.timelineContainer.innerHTML = '';
        try {
            const timelineData = await apiCall('timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ concept: concept })
            });
            if (timelineData.length === 0) {
                elements.timelineContainer.innerHTML = `<p class="text-violet-300">No historical data found for "${concept}".</p>`;
            } else {
                timelineData.forEach(item => {
                    const timelineItem = `<div class="mb-8 relative"><div class="timeline-dot w-6 h-6 absolute -left-3 mt-1.5 rounded-full"></div><div class="pl-10"><span class="bg-violet-500/30 text-pink-300 font-bold px-3 py-1 rounded-full text-sm">${item.year}</span><p class="mt-2 text-violet-200">${item.content}</p></div></div>`;
                    elements.timelineContainer.innerHTML += timelineItem;
                });
            }
        } catch (error) {
             elements.timelineContainer.innerHTML = `<p class="text-red-400">Failed to fetch timeline.</p>`;
        } finally {
            elements.timelineLoading.classList.add('hidden');
            elements.timelineContainer.classList.remove('hidden');
        }
    };

    const sendMessage = async () => {
        const question = elements.chatInput.value.trim();
        if (!question) return;
        addUserMessage(question);
        elements.chatInput.value = '';
        elements.chatStatus.textContent = 'Thinking...';
        try {
            let result;
            if (currentDocumentText) {
                result = await apiCall('chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ context: currentDocumentText, question: question })
                });
            } else {
                result = await apiCall('general_chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: question })
                });
            }
            addBotMessage(result.answer);
        } catch (error) {
            addBotMessage("Sorry, I encountered an error. Please try again.");
        } finally {
            elements.chatStatus.textContent = currentFileName ? `Analyzing: ${currentFileName}` : 'Ready to assist';
        }
    };

    const resetAppForNewFile = () => {
        currentDocumentText = null;
        currentFileName = null;
        elements.fileInput.value = '';
        elements.simplifyResults.classList.add('hidden');
        elements.simplifiedContent.innerHTML = '';
        elements.predictResults.innerHTML = '';
        elements.predictResults.classList.add('hidden');
        elements.predictionOutcome.innerHTML = '';
        elements.predictionOutcome.classList.add('hidden');
        elements.uploadArea.classList.remove('hidden');
        elements.chatMessages.innerHTML = `<div class="p-3 rounded-lg bg-black/20 max-w-xs text-sm text-violet-200 rounded-bl-none">Hello! I am your AI Legal Assistant. Ask me any legal question.</div>`;
        elements.chatStatus.textContent = 'Ready to assist';
        lucide.createIcons();
    };
    
    // --- UI HELPER FUNCTIONS ---
    const handleDrop = (e) => handleFileUpload(e.dataTransfer.files[0]);
    const switchTab = (tabName) => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        getEl(tabName).classList.remove('hidden');
    };
    const handlePageNavigation = (e) => {
        e.preventDefault();
        const pageId = e.currentTarget.dataset.page;
        document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
        getEl(`page-${pageId}`).classList.remove('hidden');
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageId) link.classList.add('active');
        });
        elements.mobileMenu.classList.add('hidden');
        lucide.createIcons();
    };
    const addUserMessage = (text) => {
        const messageEl = `<div class="p-3 rounded-lg text-sm max-w-xs bg-violet-600 text-white rounded-br-none ml-auto">${text}</div>`;
        elements.chatMessages.innerHTML += messageEl;
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    };
    const addBotMessage = (text) => {
        const messageEl = `<div class="p-3 rounded-lg text-sm max-w-xs bg-black/20 text-violet-200 rounded-bl-none">${text.replace(/\n/g, '<br>')}</div>`;
        elements.chatMessages.innerHTML += messageEl;
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    };
    const showNotification = (message, type = 'info') => {
        const container = getEl('notification-container');
        const colors = {
            success: 'from-emerald-500 to-green-600',
            error: 'from-red-500 to-rose-600',
            warning: 'from-amber-500 to-orange-600',
            info: 'from-blue-500 to-sky-600',
        };
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : type === 'warning' ? 'alert-circle' : 'info';
        const notification = document.createElement('div');
        notification.className = `flex items-center gap-3 text-white font-semibold p-4 rounded-lg shadow-2xl bg-gradient-to-r ${colors[type]} transform translate-x-full opacity-0 transition-all duration-500`;
        notification.innerHTML = `<i data-lucide="${icon}"></i><p>${message}</p>`;
        container.appendChild(notification);
        lucide.createIcons();
        setTimeout(() => notification.classList.remove('translate-x-full', 'opacity-0'), 10);
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 4000);
    };
    const updateHistory = (fileName) => {
        let history = JSON.parse(localStorage.getItem('legalEaseHistory')) || [];
        const now = new Date();
        const entry = { name: fileName, date: now.toLocaleDateString() };
        history = [entry, ...history.filter(item => item.name !== fileName)].slice(0, 5);
        localStorage.setItem('legalEaseHistory', JSON.stringify(history));
        loadHistory();
    };
    const loadHistory = () => {
        const history = JSON.parse(localStorage.getItem('legalEaseHistory')) || [];
        if (history.length === 0) {
            elements.historyList.innerHTML = `<p class="text-violet-300 text-center">No documents analyzed yet.</p>`;
        } else {
            elements.historyList.innerHTML = '';
            history.forEach(item => {
                const historyItem = `<div class="flex justify-between items-center p-2 rounded-lg hover:bg-white/10"><div class="flex items-center gap-3"><i data-lucide="file-text" class="w-5 h-5 text-violet-300"></i><span class="text-white">${item.name}</span></div><span class="text-xs text-violet-400">${item.date}</span></div>`;
                elements.historyList.innerHTML += historyItem;
            });
            lucide.createIcons();
        }
    };
    const toggleChatModal = () => {
        const chatModal = getEl('chat-modal');
        if (!chatModal) return;
        chatModal.classList.toggle('hidden');
        chatModal.classList.toggle('active');
        if (chatModal.classList.contains('active') && elements.generalChatMessages.children.length === 0) {
            addGeneralChatMessage("Hello! Ask me any general legal question.", 'bot');
        }
    };
    const addGeneralChatMessage = (text, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = text.replace(/\*\*/g, '');
        messageDiv.className = sender === 'user' ? 'general-user-message' : 'general-bot-message';
        elements.generalChatMessages.appendChild(messageDiv);
        elements.generalChatMessages.scrollTop = elements.generalChatMessages.scrollHeight;
    };
    const sendGeneralMessage = async () => {
        const question = elements.generalChatInput.value.trim();
        if (!question) return;
        addGeneralChatMessage(question, 'user');
        elements.generalChatInput.value = '';
        try {
            const result = await apiCall('general_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });
            addGeneralChatMessage(result.answer, 'bot');
        } catch (error) {
            addGeneralChatMessage("Sorry, I couldn't get an answer. Please try again.", 'bot');
        }
    };

    initializeApp();
});
