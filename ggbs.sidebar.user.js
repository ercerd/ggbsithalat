// ==UserScript==
// @name         GGBS Sidebar
// @namespace    http://tampermonkey.net/
// @version      1.19
// @description  Adds a sidebar with buttons to select specific values from dropdowns in any iframe and click a specific button
// @author       Your Name
// @match        http://172.20.20.103/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        http://172.20.20.104/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        http://172.20.20.105/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        http://172.20.20.106/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        http://172.20.20.107/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        http://172.20.20.108/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        http://172.20.20.109/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        https://ggbs.tarim.gov.tr/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @match        http://ggbs.tarim.gov.tr/cis/servlet/StartCISPage?PAGEURL=/FSIS/ggbs.giris.html&POPUPTITLE=AnaMenu
// @updateURL   https://raw.githubusercontent.com/ercerd/ggbsithalat/main/ggbs.sidebar.user.js
// @downloadURL https://raw.githubusercontent.com/ercerd/ggbsithalat/main/ggbs.sidebar.user.js
// @grant        GM_log
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Helper functions
    const selectOption = (iframeDocument, dropdownId, optionIndex) => new Promise((resolve, reject) => {
        try {
            const dropdown = iframeDocument.getElementById(dropdownId);
            if (dropdown) {
                dropdown.selectedIndex = optionIndex;
                dropdown.dispatchEvent(new Event('change', { bubbles: true }));
                dropdown.dispatchEvent(new Event('input', { bubbles: true }));
                GM_log(`Option ${optionIndex} selected in dropdown with id ${dropdownId}`);
                resolve(true);
            } else {
                GM_log(`Dropdown with id ${dropdownId} not found in this iframe`);
                resolve(false);
            }
        } catch (error) {
            GM_log('Error accessing the dropdown: ' + error);
            reject(error);
        }
    });

    const copyFieldValue = (iframeDocument, sourceFieldId, targetFieldId) => new Promise((resolve, reject) => {
        try {
            const sourceField = iframeDocument.getElementById(sourceFieldId);
            const targetField = iframeDocument.getElementById(targetFieldId);
            if (sourceField && targetField) {
                targetField.value = sourceField.value;
                targetField.dispatchEvent(new Event('change', { bubbles: true }));
                targetField.dispatchEvent(new Event('input', { bubbles: true }));
                GM_log(`Value copied from ${sourceFieldId} to ${targetFieldId}`);
                resolve(true);
            } else {
                GM_log(`Source or target field not found`);
                resolve(false);
            }
        } catch (error) {
            GM_log('Error copying field value: ' + error);
            reject(error);
        }
    });

    const clickButtonWithId = (doc, buttonId) => new Promise((resolve, reject) => {
        try {
            const button = doc.getElementById(buttonId);
            if (button) {
                const mousedownEvent = new UIEvent('mousedown', { bubbles: true, cancelable: true, view: doc.defaultView || window });
                const mouseupEvent = new UIEvent('mouseup', { bubbles: true, cancelable: true, view: doc.defaultView || window });
                const clickEvent = new UIEvent('click', { bubbles: true, cancelable: true, view: doc.defaultView || window });

                button.dispatchEvent(mousedownEvent);
                button.dispatchEvent(mouseupEvent);
                button.dispatchEvent(clickEvent);
                GM_log(`${buttonId} ID'li düğme tıklandı`);
                resolve(true);
            } else {
                GM_log(`${buttonId} ID'li düğme bulunamadı`);
                resolve(false);
            }
        } catch (error) {
            GM_log('Düğmeye tıklama hatası: ' + error);
            reject(error);
        }
    });

    const openArea = (iframeDocument) => {
        const areaDiv = iframeDocument.getElementById('AREADIV105');
        if (areaDiv) {
            areaDiv.style.display = 'block';
        }
    };

    const isIframeVisible = (iframe) => {
        if (!iframe.getBoundingClientRect) {
            return false;
        }
        const rect = iframe.getBoundingClientRect();
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        const windowWidth = (window.innerWidth || document.documentElement.clientWidth);

        const vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
        const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);

        return (vertInView && horInView) &&
               window.getComputedStyle(iframe).visibility !== 'hidden' &&
               window.getComputedStyle(iframe).display !== 'none' &&
               iframe.offsetWidth > 0 && iframe.offsetHeight > 0;
    };

    const findTargetIframe = (targetUrl) => {
        const iframes = document.getElementsByTagName('iframe');
        for (let iframe of iframes) {
            try {
                if (iframe.contentDocument &&
                    iframe.contentDocument.location.href.includes(targetUrl) &&
                    isIframeVisible(iframe)) {
                    return iframe.contentDocument;
                }
            } catch (error) {
                GM_log('Error accessing iframe: ' + error);
            }
        }
        return null;
    };

    const findB9ButtonInIframes = (doc) => {
        const button = doc.getElementById('B_9');
        if (button) {
            return { document: doc, button: button };
        }

        const iframes = doc.getElementsByTagName('iframe');
        for (let i = 0; i < iframes.length; i++) {
            try {
                const result = findB9ButtonInIframes(iframes[i].contentDocument);
                if (result) {
                    return result;
                }
            } catch (error) {
                GM_log('Error accessing iframe: ' + error);
            }
        }

        return null;
    };

    const waitForElement = (doc, elementId) => new Promise((resolve, reject) => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (doc.getElementById(elementId)) {
                    observer.disconnect();
                    resolve();
                }
            });
        });

        observer.observe(doc.body, { childList: true, subtree: true });
    });

    // Action functions
    const button1Action = () => {
        const iframeDocument = findTargetIframe('ggbs.ithalat.ithalat.html');
        if (iframeDocument) {
            selectOption(iframeDocument, 'CDYN_115', 3)
                .then(result => result && selectOption(iframeDocument, 'CDYN_125', 1))
                .then(result => result && clickButtonWithId(iframeDocument, 'B_35'))
                .catch(error => GM_log('Error performing actions for button 1: ' + error));
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const onyButtonAction = () => {
        const result = findB9ButtonInIframes(document);
        if (result) {
            clickButtonWithId(result.document, 'B_9')
                .then(() => GM_log('B_9 button clicked successfully'))
                .catch(error => GM_log('Error clicking B_9 button: ' + error));
        } else {
            GM_log('B_9 button not found in any iframe');
        }
    };

    const button2Action = () => {
        const iframeDocument = findTargetIframe('ggbs.ithalat.ithalat.html');
        if (iframeDocument) {
            selectOption(iframeDocument, 'CDYN_115', 3)
                .then(result => result && selectOption(iframeDocument, 'CDYN_125', 3))
                .then(result => result && clickButtonWithId(iframeDocument, 'B_35'))
                .catch(error => GM_log('Error performing actions for button 2: ' + error));
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const button3Action = () => {
        const iframeDocument = findTargetIframe('ggbs.ithalat.ithalatOnay.html');
        if (iframeDocument) {
            openArea(iframeDocument);
            selectOption(iframeDocument, 'CDYN_92', 1)
                .then(result => result && copyFieldValue(iframeDocument, 'F_57', 'F_81'))
                .then(result => result && clickButtonWithId(iframeDocument, 'B_26'))
                .catch(error => GM_log('Error performing actions for button 3: ' + error));
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const button4Action = () => {
        const iframeDocument = findTargetIframe('ggbs.ithalat.ithalatOnay.html');
        if (iframeDocument) {
            openArea(iframeDocument);
            clickButtonWithId(iframeDocument, 'RADIO122')
                .then(() => waitForElement(iframeDocument, 'CDYN_126'))
                .then(() => selectOption(iframeDocument, 'CDYN_126', 1))
                .then(() => waitForElement(iframeDocument, 'RADIO147'))
                .then(() => clickButtonWithId(iframeDocument, 'RADIO147'))
                .then(() => waitForElement(iframeDocument, 'RADIO174'))
                .then(() => clickButtonWithId(iframeDocument, 'RADIO174'))
                .catch(error => GM_log('Error performing actions for button 4: ' + error));
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const button5Action = () => {
        const iframeDocument = findTargetIframe('ggbs.denetim.denetleme.html');
        if (iframeDocument) {
            const inputValue = prompt("Lütfen değeri girin:");
            if (inputValue === null || inputValue.trim() === "") {
                alert("Geçerli bir değer girilmedi. İşlem iptal edildi.");
                return;
            }

            const today = new Date();
            const formattedDate = today.toLocaleDateString('en-GB');
            const startDate = `${formattedDate} 09:00`;
            const endDate = `${formattedDate} 18:00`;

            selectOption(iframeDocument, 'CDYN_274', 2)
                .then(() => {
                    const field57 = iframeDocument.getElementById('F_57');
                    if (field57) {
                        field57.value = '';
                        field57.dispatchEvent(new Event('change', { bubbles: true }));
                        field57.dispatchEvent(new Event('input', { bubbles: true }));

                        field57.value = inputValue;
                        field57.dispatchEvent(new Event('change', { bubbles: true }));
                        field57.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        GM_log('Field F_57 not found');
                    }

                    const field253 = iframeDocument.getElementById('F_253');
                    if (field253) {
                        field253.value = startDate;
                        field253.dispatchEvent(new Event('change', { bubbles: true }));
                        field253.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        GM_log('Field F_253 not found');
                    }

                    const field256 = iframeDocument.getElementById('F_256');
                    if (field256) {
                        field256.value = endDate;
                        field256.dispatchEvent(new Event('change', { bubbles: true }));
                        field256.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        GM_log('Field F_256 not found');
                    }

                    return clickButtonWithId(iframeDocument, 'B_335');
                })
                .catch(error => GM_log('Error performing actions for button 5: ' + error));
        } else {
            GM_log('Target iframe for denetim not found or not visible');
        }
    };

    const button6Action = () => {
        const iframeDocument = findTargetIframe('ggbs.numune.numune.html');
        if (iframeDocument) {
            const combinedInput = prompt("Lütfen mühür numarasını ve firma adının ilk üç harfini aralarında virgül olacak şekilde girin (örn. 123456, ABC):");
            if (combinedInput === null || combinedInput.trim() === "") {
                alert("Geçerli bir mühür numarası ve firma adı girilmedi. İşlem iptal edildi.");
                return;
            }

            const [muhurNo, firmaIlkUcHarf] = combinedInput.split(',').map(item => item.trim());

            if (!muhurNo || !firmaIlkUcHarf) {
                alert("Geçerli bir mühür numarası ve firma adı girilmedi. İşlem iptal edildi.");
                return;
            }

            const field58 = iframeDocument.getElementById('F_58');
            if (field58) {
                field58.value = muhurNo;
                field58.dispatchEvent(new Event('change', { bubbles: true }));
                field58.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const field55 = iframeDocument.getElementById('F_55');
            if (field55) {
                const muhurSon6Hane = muhurNo.slice(-6);
                field55.value = `33-20024-iee-${firmaIlkUcHarf}-${muhurSon6Hane}`;
                field55.dispatchEvent(new Event('change', { bubbles: true }));
                field55.dispatchEvent(new Event('input', { bubbles: true }));
            }

            selectOption(iframeDocument, 'CDYN_117', 1)
                .catch(error => GM_log('Error performing actions for button 6: ' + error));
        } else {
            GM_log('Target iframe for Numune Genel Bilgiler not found or not visible');
        }
    };

    const button7Action = () => {
        const iframeDocument = findTargetIframe('ggbs.numune.numune.html');
        if (iframeDocument) {
            waitForElement(iframeDocument, 'CDYN_135')
                .then(() => selectOption(iframeDocument, 'CDYN_135', 6))
                .then(() => waitForElement(iframeDocument, 'CDYN_137'))
                .then(() => selectOption(iframeDocument, 'CDYN_137', 2))
                .then(() => waitForElement(iframeDocument, 'CDYN_144'))
                .then(() => selectOption(iframeDocument, 'CDYN_144', 2))
                .then(() => {
                    const today = new Date();
                    const formattedDate = today.toLocaleDateString('en-GB');
                    const startDate = `${formattedDate} 09:00`;

                    const field172 = iframeDocument.getElementById('F_172');
                    if (field172) {
                        field172.value = startDate;
                        field172.dispatchEvent(new Event('change', { bubbles: true }));
                        field172.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        GM_log('Field F_172 not found');
                    }

                    const field133 = iframeDocument.getElementById('F_133');
                    const field140 = iframeDocument.getElementById('F_140');
                    if (field133) {
                        field133.value = '';
                        field133.dispatchEvent(new Event('change', { bubbles: true }));
                        field133.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (field140) {
                        field140.value = '';
                        field140.dispatchEvent(new Event('change', { bubbles: true }));
                        field140.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                })
                .catch(error => GM_log('Error performing actions for button 7: ' + error));
        } else {
            GM_log('Target iframe for KG Numune Bilgileri not found or not visible');
        }
    };

    const button8Action = () => {
        const iframeDocument = findTargetIframe('ggbs.numune.numune.html');
        if (iframeDocument) {
            waitForElement(iframeDocument, 'CDYN_135')
                .then(() => selectOption(iframeDocument, 'CDYN_135', 4))
                .then(() => waitForElement(iframeDocument, 'CDYN_137'))
                .then(() => selectOption(iframeDocument, 'CDYN_137', 2))
                .then(() => waitForElement(iframeDocument, 'CDYN_144'))
                .then(() => selectOption(iframeDocument, 'CDYN_144', 2))
                .then(() => {
                    const today = new Date();
                    const formattedDate = today.toLocaleDateString('en-GB');
                    const startDate = `${formattedDate} 09:00`;

                    const field172 = iframeDocument.getElementById('F_172');
                    if (field172) {
                        field172.value = startDate;
                        field172.dispatchEvent(new Event('change', { bubbles: true }));
                        field172.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        GM_log('Field F_172 not found');
                    }

                    const field133 = iframeDocument.getElementById('F_133');
                    const field140 = iframeDocument.getElementById('F_140');
                    if (field133) {
                        field133.value = '';
                        field133.dispatchEvent(new Event('change', { bubbles: true }));
                        field133.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (field140) {
                        field140.value = '';
                        field140.dispatchEvent(new Event('change', { bubbles: true }));
                        field140.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                })
                .catch(error => GM_log('Error performing actions for button 8: ' + error));
        } else {
            GM_log('Target iframe for Adet Numune Bilgileri not found or not visible');
        }
    };

    const ekleButtonAction = () => {
        const iframeDocument = findTargetIframe('ggbs.ithalat.ithalat.html');
        if (iframeDocument) {
            clickButtonWithId(iframeDocument, 'B_309')
                .catch(error => GM_log('Error performing actions for Ekle button: ' + error));
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const denetimekleButtonAction = () => {
        const iframeDocument = findTargetIframe('ggbs.denetim.denetleme.html');
        if (iframeDocument) {
            clickButtonWithId(iframeDocument, 'B_23')
                .catch(error => GM_log('Error performing actions for denetimekle button: ' + error));
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const denAcButtonAction = () => {
        const iframeDocument = findTargetIframe('ggbs.ithalat.ithalatOnay.html');
        if (iframeDocument) {
            clickButtonWithId(iframeDocument, 'B_189')
                .catch(error => GM_log('Error performing actions for Den.Aç button: ' + error));
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const buttondokumanonayla = () => {
        const iframeDocument = findTargetIframe('ggbs.ithalat.ithalatOnay.html');
        if (iframeDocument) {
            openArea(iframeDocument);
            clickButtonWithId(iframeDocument, 'RADIO122')
                .then(() => waitForElement(iframeDocument, 'CDYN_126'))
                .then(() => selectOption(iframeDocument, 'CDYN_126', 2))
                .then(() => waitForElement(iframeDocument, 'B_32'))
                .then(() => {
                    return new Promise((resolve, reject) => {
                        const confirmAction = confirm("ID numarası verilecek; emin misiniz?");
                        if (confirmAction) {
                            resolve();
                        } else {
                            reject(new Error("İşlem kullanıcı tarafından iptal edildi."));
                        }
                    });
                })
                .then(() => clickButtonWithId(iframeDocument, 'B_32'))
                .catch(error => {
                    if (error.message === "İşlem kullanıcı tarafından iptal edildi.") {
                        GM_log('İşlem kullanıcı tarafından iptal edildi.');
                    } else {
                        GM_log('Error performing actions for buttondokumanonayla: ' + error);
                    }
                });
        } else {
            GM_log('Target iframe not found or not visible');
        }
    };

    const numuneeklebuttonaction = () => {
        const iframeDocument = findTargetIframe('ggbs.denetim.denetleme.html');
        if (iframeDocument) {
            const numunelerTab = iframeDocument.getElementById('TPTD3308');
            if (numunelerTab) {
                numunelerTab.click();
                if (typeof C !== 'undefined' && C.showPageTABAREA) {
                    C.showPageTABAREA(C_308, 2);
                }
            }

            clickButtonWithId(iframeDocument, 'B_380')
                .then(() => GM_log('Clicked on B_380 button in Denetim iframe'))
                .catch(error => GM_log('Error clicking B_380 button: ' + error));
        } else {
            GM_log('Target iframe for Denetim not found or not visible');
        }
    };

    const createSquareButtons = (parentElement) => {
    const buttonLabels = ['ANK', 'BAL', 'İST', 'İZM', 'İL', 'MGA', 'MRL', 'MSM', 'PMG', 'SİA', 'SOU', 'STA'];
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'square-button-container';
        buttonContainer.style.display = 'grid';
        buttonContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';

        buttonLabels.forEach((label, index) => {
            const button = document.createElement('button');
            button.innerText = label;

            button.addEventListener('click', () => {
                const iframeDocument = findTargetIframe('ggbs.numune.numune.html');
                if (iframeDocument) {
                    selectOption(iframeDocument, 'CDYN_150', index + 1);
                } else {
                    GM_log('Target iframe for Numune Bilgileri not found or not visible');
                }
            });
            buttonContainer.appendChild(button);
        });

        parentElement.appendChild(buttonContainer);
    };

    const addFloatingSidebar = () => {
        const sidebar = document.createElement('div');
        sidebar.id = 'floatingSidebar';

        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggleSidebar';
        toggleButton.innerHTML = '<i class="fas fa-bars"></i>'; // Font Awesome bars icon
        toggleButton.onclick = function() {
            const sidebarElement = document.getElementById('floatingSidebar');
            sidebarElement.style.display = sidebarElement.style.display === 'none' ? 'block' : 'none';
        };

        const groupedIframeActions = [
            { groupName: "İthalat İşlemleri", buttons: [
                { text: 'Ek2 ve Gıda San.', action: button1Action, additionalButtons: [
                    { text: 'Ony', action: onyButtonAction },
                    { text: 'Ekle', action: ekleButtonAction }
                ]},
                { text: 'Ek2 ve Piy. Arz.', action: button2Action, additionalButtons: [
                    { text: 'Ony', action: onyButtonAction },
                    { text: 'Ekle', action: ekleButtonAction }
                ]},
            ]},
            { groupName: "Onay İşlemleri", buttons: [
                { text: 'Miktar ve Gümrük seç', action: button3Action, additionalButtons: [
                    { text: 'Onayla', action: buttondokumanonayla }
                ]},
                { text: 'Analize', action: button4Action, additionalButton: { text: 'Den.Say.Aç', action: denAcButtonAction } }
            ]},
            { groupName: "Denetim İşlemleri", buttons: [
                { text: 'Dntm. İşlemleri', action: button5Action, additionalButtons: [
                    { text: 'DenEkle', action: denetimekleButtonAction }
                ]},
                { text: 'Numune Ekle', action: numuneeklebuttonaction }
            ]},
            { groupName: "Numune İşlemleri", buttons: [
                { text: 'Numune Genel Bilgiler', action: button6Action },
                { text: 'KG Numune Bilgileri', action: button7Action },
                { text: 'Adet Numune Bilgileri', action: button8Action }
            ]}
        ];

        groupedIframeActions.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-div';
            groupDiv.style.marginBottom = '1px';
            groupDiv.style.border = '1px solid #ccc';
            groupDiv.style.padding = '2px';
            groupDiv.style.borderRadius = '5px';
            groupDiv.style.backgroundColor = 'rgba(233, 233, 233, 0.7)';

            const groupTitle = document.createElement('h3');
            groupTitle.innerText = group.groupName;
            groupDiv.appendChild(groupTitle);

            group.buttons.forEach(buttonInfo => {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';
                buttonContainer.style.display = 'flex';
                buttonContainer.style.marginBottom = '1px';

                const button = document.createElement('button');
                button.className = 'normal-button'
                button.innerText = buttonInfo.text;
                button.addEventListener('click', buttonInfo.action);
                button.style.flex = '1';
                buttonContainer.appendChild(button);

                if (buttonInfo.additionalButtons) {
                    buttonInfo.additionalButtons.forEach(additionalButton => {
                        const addButton = document.createElement('button');
                        addButton.innerText = additionalButton.text;
                        addButton.addEventListener('click', additionalButton.action);
                        addButton.style.width = 'auto';
                        addButton.style.marginLeft = '2px';
                        buttonContainer.appendChild(addButton);
                    });
                } else if (buttonInfo.additionalButton) {
                    const additionalButton = document.createElement('button');
                    additionalButton.innerText = buttonInfo.additionalButton.text;
                    additionalButton.addEventListener('click', buttonInfo.additionalButton.action);
                    additionalButton.style.width = 'auto';
                    additionalButton.style.marginLeft = '2px';
                    buttonContainer.appendChild(additionalButton);
                }

                groupDiv.appendChild(buttonContainer);
            });

            if (group.groupName === "Numune İşlemleri") {
                createSquareButtons(groupDiv);
            }

            sidebar.appendChild(groupDiv);
        });

        document.body.appendChild(toggleButton);
        document.body.appendChild(sidebar);
    };

    GM_addStyle(`
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');
        #floatingSidebar {
            position: fixed;
            top: 40px;
            right: 20px;
            width: 150px;
            background-color: rgba(242, 242, 242, 0.9);
            border: 1px solid #ccc;
            border-radius: 1px;
            padding: 1px;
            z-index: 10000;
            max-height: 95vh;
            overflow-y: auto;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
        }
        #floatingSidebar button {
            display: inline-block;
            margin-bottom: 2px;
            padding: 3px 5px;
            border: none;
            border-radius: 3px;
            background-color: #4CAF50;
            color: white;
            font-size: 10px;
            cursor: pointer;
            transition: background-color 0.2s;
            white-space: normal;
            overflow: hidden;
            text-overflow: ellipsis;
            height: auto;
            min-height: 30px;
            line-height: 1.2;
        }
        #floatingSidebar button:hover {
            background-color: #45a049;
        }
        #floatingSidebar h3 {
            font-size: 14px;
            color: #333;
            margin: 2px 0;
            padding: 0;
        }
        #toggleSidebar {
            position: fixed;
            top: 25px;
            right: 5px;
            z-index: 10001;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 3px 6px;
            cursor: pointer;
            font-size: 11px;
        }
        #floatingSidebar .group-div {
            margin-bottom: 3px;
            border: 1px solid #ccc;
            padding: 2px;
            border-radius: 3px;
            background-color: rgba(233, 233, 233, 0.7);
        }
        #floatingSidebar .button-container {
            display: flex;
            margin-bottom: 2px;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        #floatingSidebar .button-container button:first-child {
            flex: 0 1 auto;
            font-size: 12px;
            margin-bottom: 2px;
        }
        #floatingSidebar .button-container button:not(:first-child) {
            flex: 0 1 auto;
            margin-left: 2px;
            padding: 1px 3px;
            font-size: 12px;
            min-width: 28px;
            min-height: 20px;
        }
        #floatingSidebar .square-button-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2px;
            margin-top: 3px;
            font-size: 12px;
        }
        #floatingSidebar .square-button-container button {
            padding: 2px;
            font-size: 9px;
            width: 100%;
            height: 20px;
            min-height: unset;
            font-size: 12px;
        }
    `);

    window.addEventListener('load', addFloatingSidebar);
})();
