/**
 * @typedef {import("@/js/presets/source/retriever.js").PresetData} PresetData
 * @typedef {import("@/js/presets/source/source.js").Source} Source
 */

import CliEngine from '@/js/cli_engine.js';
import * as filesystem from '@/js/filesystem.js';
import PresetInstance from '@/js/presets/source/preset_instance.js';
import PresetDialog from '@/js/presets/preset_dialog.js';
import PresetPanel from '@/js/presets/preset_panel.js';
import Sources from '@/js/presets/sources.js';
import FavoritePresetsClass from '@/js/presets/favorites.js';
import { FC } from "@/js/fc.svelte.js";

const COMMAND_DIFF_ALL = "diff all";
const COMMAND_DUMP_ALL = "dump all";

class PresetsTab {
    /**
     * @type {import("@/js/presets/source/source.js").Source[]}
     */
    activePresetsSources = [];
    /**
     * @type {CliEngine}
     */
    #cliEngine = null;

    /**
     * @type {import("@/js/presets/preset_panel.js").PresetPanel[]}
     */
    presetsPanels = [];

    majorVersion = 1;

    /**
     * @type {import("@/js/presets/favorites.js").default}
     */
    #favoritePresets = null;

    /**
     * @type {PresetDialog}
     */
    presetsDetailedDialog = null;

    /**
     * @type {Sources}
     */
    presetsSourcesDialog = null;

    /**
     * @type {PresetInstance[]}
     */
    #presetInstances = [];

    /**
     * @typedef {Object} DOMElements
     * @property {?HTMLElement} divGlobaling - The global loading indicator element.
     * @property {?HTMLElement} divGlobalLoadingError - The global loading error indicator element.
     * @property {?HTMLElement} divCli - The CLI (Command Line Interface) container element.
     * @property {?HTMLElement} divMainContent - The main content container element.
     * @property {?HTMLSelectElement} selectCategory - The dropdown for selecting a category.
     * @property {?HTMLSelectElement} selectKeyword - The dropdown for selecting a keyword.
     * @property {?HTMLSelectElement} selectAuthor - The dropdown for selecting an author.
     * @property {?HTMLSelectElement} selectFirmwareVersion - The dropdown for selecting a firmware version.
     * @property {?HTMLSelectElement} selectStatus - The dropdown for selecting a status.
     * @property {?HTMLInputElement} inputTextFilter - The input field for text filtering.
     * @property {?HTMLElement} divPresetList - The container for the preset list.
     * @property {?HTMLButtonElement} buttonSave - The save button element.
     * @property {?HTMLButtonElement} buttonCancel - The cancel button element.
     * @property {?HTMLButtonElement} reloadButton - The reload button element.
     * @property {?HTMLElement} contentWrapper - The wrapper element for the main content.
     * @property {?HTMLElement} dialogCli - The CLI dialog element.
     * @property {?HTMLButtonElement} buttonCliExit - The button to exit the CLI dialog.
     * @property {?HTMLButtonElement} buttonCliSave - The button to save changes in the CLI dialog.
     * @property {?HTMLElement} progressDialogProgressBar - The progress bar element in the progress dialog.
     * @property {?HTMLElement} dialogCliWarning - The warning dialog element for CLI-related issues.
     * @property {?HTMLButtonElement} buttonBackupDiffAll - The button to backup all differences.
     * @property {?HTMLButtonElement} buttonBackupDumpAll - The button to dump all backups.
     * @property {?HTMLButtonElement} buttonBackupLoad - The button to load a backup.
     * @property {?HTMLButtonElement} buttonPresetSources - The button to manage preset sources.
     * @property {?HTMLElement} warningNotOfficialSource - The warning element for unofficial sources.
     * @property {?HTMLElement} warningFailedToLoadRepositories - The warning element for failed repository loads.
     * @property {?HTMLElement} warningBackup - The warning element for backup-related issues.
     * @property {?HTMLButtonElement} buttonHideBackupWarning - The button to hide the backup warning.
     * @property {?HTMLElement} listNoFound - The element displayed when no items are found.
     * @property {?HTMLElement} listTooManyFound - The element displayed when too many items are found.
     * 
     */
    
    /**
     * @type {DOMElements}
     */
    #dom = {
        divGlobalLoading: null,
        divGlobalLoadingError: null,
        divCli: null,
        divMainContent: null,

        selectCategory: null,
        selectKeyword: null,
        selectAuthor: null,
        selectFirmwareVersion: null,
        selectStatus: null,
        inputTextFilter: null,
        divPresetList: null,

        buttonSave: null,
        buttonCancel: null,

        reloadButton: null,
        contentWrapper: null,

        dialogCli: null,
        buttonCliExit: null,
        buttonCliSave: null,
        progressDialogProgressBar: null,
        dialogCliWarning: null,

        buttonBackupDiffAll: null,
        buttonBackupDumpAll: null,
        buttonBackupLoad: null,
        buttonPresetSources: null,

        warningNotOfficialSource: null,
        warningFailedToLoadRepositories: null,
        warningBackup: null,
        buttonHideBackupWarning: null,

        listNoFound: null,
        listTooManyFound: null,
    };

    /**
     * Initializes the presets tab.
     * @param {?Function} callback 
     */
    initialize(callback) {
        this.#cliEngine = new CliEngine(this);
        this.#cliEngine.setProgressCallback(value => this.onApplyProgressChange(value));

        this.#favoritePresets = new FavoritePresetsClass();
        this.#favoritePresets.loadFromStorage();

        const self = this;
        $('#content').load("/src/tabs/presets/presets.html", () => self.onHtmlLoad(callback));

        if (GUI.active_tab !== 'presets') {
            GUI.active_tab = 'presets';
        }
    };

    /**
     * Reads the DOM elements for the presets tab.
     */
    #readDom() {
        this.#dom.divGlobalLoading = $('#presets_global_loading');
        this.#dom.divGlobalLoadingError = $('#presets_global_loading_error');
        this.#dom.divCli = $('#presets_cli');
        this.#dom.divMainContent = $('#presets_main_content');
        this.#dom.selectCategory = $('#presets_filter_category');
        this.#dom.selectKeyword = $('#presets_filter_keyword');
        this.#dom.selectAuthor = $('#presets_filter_author');
        this.#dom.selectFirmwareVersion = $('#presets_filter_firmware_version');
        this.#dom.selectStatus = $('#presets_filter_status');
        this.#dom.inputTextFilter = $('#presets_filter_text');
        this.#dom.divPresetList = $('#presets_list');

        this.#dom.buttonSave = $("#presets_save_button");
        this.#dom.buttonCancel = $("#presets_cancel_button");

        this.#dom.reloadButton = $("#presets_reload");
        this.#dom.contentWrapper = $("#presets_content_wrapper");

        this.#dom.dialogCli = $("#presets_cli_dialog");
        this.#dom.buttonCliExit = $("#presets_cli_exit_button");
        this.#dom.buttonCliSave = $("#presets_cli_save_button");
        this.#dom.progressDialogProgressBar = $(".presets_apply_progress_dialog_progress_bar");
        this.#dom.dialogCliWarning = $(".presets_cli_errors_dialog_warning");

        this.#dom.buttonBackupDiffAll = $(".backup_diff_all");
        this.#dom.buttonBackupDumpAll = $(".backup_dump_all");
        this.#dom.buttonBackupLoad = $(".backup_load");
        this.#dom.buttonPresetSources = $(".presets_sources_show");

        this.#dom.warningNotOfficialSource = $(".presets_warning_not_official_source");
        this.#dom.warningFailedToLoadRepositories = $(".presets_failed_to_load_repositories");
        this.#dom.warningBackup = $(".presets_warning_backup");
        this.#dom.buttonHideBackupWarning = $(".presets_warning_backup_button_hide");

        this.#dom.listNoFound = $("#presets_list_no_found");
        this.#dom.listTooManyFound = $("#presets_list_too_many_found");
    };

    /**
     * Renders the CLI commands for all picked presets.
     * @returns {string[]}
     */
    getPickedPresetsCli() {
        let result = [];
        this.#presetInstances.forEach(pi => {
            result.push(...pi.renderedCliArr);
        });
        result = result.filter(command => command.trim() !== "");
        return result;
    };

    onApplyProgressChange(value) {
        this.#dom.progressDialogProgressBar.val(value);
    };

    applyCommandsList(strings) {
        strings.forEach(cliCommand => {
            this.#cliEngine.sendLine(cliCommand);
        });
    };

    async previewCommands() {
        const previewArea = $("#snippetpreviewcontent textarea#preview");
        const self = this;
        function executeSnippet() {
            const commands = previewArea.val();
            self.#cliEngine.executeCommands(commands);
            GUI.snippetPreviewWindow.close();
        }
        function previewCommands(result, fileName) {
            if (!GUI.snippetPreviewWindow) {
                GUI.snippetPreviewWindow = new jBox("Modal", {
                    id: "snippetPreviewWindow",
                    width: 'auto',
                    height: 'auto',
                    closeButton: 'title',
                    animation: false,
                    isolateScroll: false,
                    title: i18n.getMessage("cliConfirmSnippetDialogTitle", { fileName: fileName }),
                    content: $('#snippetpreviewcontent'),
                    onCreated: () =>
                        $("#snippetpreviewcontent a.confirm").on('click', () => executeSnippet(fileName))
                    ,
                });
            }
            previewArea.val(result);
            GUI.snippetPreviewWindow.open();
        }

        try {
            const file = await window.filesystem.readTextFile({
                description: "Config files",
                extensions: [".txt", ".config"],
            });
            if (!file) return;
            previewCommands(file.content, file.name);
        } catch (err) {
            console.log("Failed to load config", err);
        }
    };

    async onSaveClick() {
        const self = this;
        const cliCommandsArray = this.getPickedPresetsCli();

        const previewArea = $("#snippetpreviewcontent textarea#preview");

        async function executeSnippet() {
            try {
                const { commands, initialCliErrorCount } = await self.activateCli().then(() => {
                    return new Promise((resolve) => {
                        const initialCliErrorCount = self.#cliEngine.errorsCount;
                        self.setupCliDialogAndShow({
                            title: i18n.getMessage("presetsApplyingPresets"),
                            buttonCancelCallback: null,
                        });
                        self.#dom.progressDialogProgressBar.show();
                        self.#dom.progressDialogProgressBar.val(0);
                        const commands = previewArea.val();
                        self.snippetPreviewWindow.close();
                        resolve({ commands, initialCliErrorCount });
                    });
                });

                console.log("new promise with commands: " + commands);

                await self.#cliEngine.executeCommands(commands).then(() => {
                    return { initialCliErrorCount }; // Pass values forward
                }).then(({ initialCliErrorCount }) => {
                    console.log("finished running commands, new error count " + self.#cliEngine.errorsCount + " and old: " + initialCliErrorCount);
                    self.#dom.progressDialogProgressBar.hide();
                    if (self.#cliEngine.errorsCount !== initialCliErrorCount) {
                        showFinalCliOptions(true);
                    } else {
                        showFinalCliOptions(false);
                    }
                });
            } catch (error) {
                console.error("Error in executeSnippet:", error);
            }
        }

        function previewCommands(result) {
            if (!self.snippetPreviewWindow) {
                self.snippetPreviewWindow = new jBox("Modal", {
                    id: "snippetPreviewWindow",
                    width: 'auto',
                    height: 'auto',
                    closeButton: 'title',
                    animation: false,
                    isolateScroll: false,
                    title: i18n.getMessage("cliConfirmSnippetDialogTitle", { fileName: "nope" }),
                    content: $('#snippetpreviewcontent'),
                    onCreated: () =>
                        $("#snippetpreviewcontent a.confirm").on('click', () => executeSnippet()),
                });
            }
            previewArea.val(result.join("\n"));
            self.snippetPreviewWindow.open();
        }

        function showFinalCliOptions(errorsEncountered) {
            $('#presets_cli_dialog textarea[name="commands"]').show();
            self.#dom.buttonCliSave.off("click");
            self.#dom.buttonCliSave.on("click", () => {
                self.#cliEngine.subscribeResponseCallback(() => {
                    self.#cliEngine.unsubscribeResponseCallback();
                    if (self.#cliEngine.inBatchMode() && errorsEncountered) {
                        // In case of batch CLI command errors, the firmware requires extra "save" command for CLI safety.
                        // No need for this safety in presets as preset tab already detected errors and showed them to the user.
                        // At this point user clicked "save anyway".
                        self.#cliEngine.sendLine(CliEngine.s_commandSave);
                    }
                });
                self.#cliEngine.sendLine(CliEngine.s_commandSave);
                self.#dom.dialogCli[0].close();
            });
            self.#dom.buttonCliSave.show();

            self.#dom.buttonCliExit.off("click");
            self.#dom.buttonCliExit.on("click", () => {
                self.#dom.dialogCli[0].close();
            });
            self.#dom.buttonCliExit.show();

            self.#dom.dialogCli.on("close", () => {
                self.#cliEngine.sendLine(CliEngine.s_commandExit);
                self.disconnectCliMakeSure();
                self.#dom.dialogCliWarning.hide();
                self.#dom.buttonCliSave.hide();
                self.#dom.buttonCliExit.hide();
                self.#dom.dialogCli.off("close");
                self.#dom.buttonCliSave.off("click");
                self.#dom.buttonCliExit.off("click");
            });
        }

        self.markPickedPresetsAsFavorites();
        previewCommands(cliCommandsArray);
    };

    disconnectCliMakeSure() {
        GUI.timeout_add('disconnect', function () {
            $('div.connect_controls a.connect').trigger("click");
        }, 500);
    };

    markPickedPresetsAsFavorites() {
        for (const pickedPreset of this.#presetInstances) {
            if (pickedPreset.source !== undefined) {
                this.#favoritePresets.add(pickedPreset.presetData, pickedPreset.source);
            }
        }

        this.#favoritePresets.saveToStorage();
    };

    setupCliDialogAndShow(cliDialogSettings) {
        // cliDialogSettings:
        // title, showCancelButton, buttonCancelCallback
        const title = $("#presets_cli_dialog_title");

        title.html(cliDialogSettings.title);
        title.show();
        if (cliDialogSettings.showCancelButton) {
            this.domButtonCliCancel.toggle(!!cliDialogSettings.buttonCancelCallback);
            this.domButtonCliCancel.off("click");

            this.domButtonCliCancel.on("click", () => {
                this.domDialogWait[0].close();
                cliDialogSettings.buttonCancelCallback?.();
            });
        }

        this.#dom.dialogCli[0].showModal();
        return this.#dom.dialogCli[0];
    };


    setupMenuButtons() {
        this.#dom.buttonSave.on("click", () => this.onSaveClick());
        this.#dom.buttonCancel.on("click", () => {
            this.#presetInstances = [];
            this.#updateSearchResults();
            this.enableSaveCancelButtons(false);
        });

        this.#dom.buttonBackupDiffAll.on("click", () => this.onSaveBackupClick("diff"));
        this.#dom.buttonBackupDumpAll.on("click", () => this.onSaveBackupClick("dump"));
        this.#dom.buttonBackupLoad.on("click", () => this.onBackupLoadClick());

        this.#dom.buttonPresetSources.on("click", () => this.onPresetSourcesShowClick());
        this.#dom.buttonHideBackupWarning.on("click", () => this.onButtonHideBackupWarningClick());

        this.#dom.buttonSave.toggleClass("disabled", false);
        this.#dom.buttonCancel.toggleClass("disabled", false);
        this.#dom.reloadButton.on("click", () => this.reload());

        this.enableSaveCancelButtons(false);

    };

    enableSaveCancelButtons(isEnabled) {
        this.#dom.buttonSave.toggleClass("disabled", !isEnabled);
        this.#dom.buttonCancel.toggleClass("disabled", !isEnabled);
    };

    onButtonHideBackupWarningClick() {
        this.#dom.warningBackup.toggle(false);
        ConfigStorage.set({ 'showPresetsWarningBackup': false });
    };

    setupBackupWarning() {
        let showPresetsWarningBackup = false;
        ConfigStorage.get('showPresetsWarningBackup', function (result) {
            if (result.showPresetsWarningBackup) {
                showPresetsWarningBackup = true;
            } else if (showPresetsWarningBackup === undefined) {
                showPresetsWarningBackup = true;
            }
        });

        const warningVisible = !!showPresetsWarningBackup;
        this.#dom.warningBackup.toggle(warningVisible);
    };

    onPresetSourcesShowClick() {
        this.presetsSourcesDialog.show().then(() => {
            this.reload();
        });
    };

    async onSaveBackupClick(backupType) {
        let waitingDialogTitle = "";

        switch (backupType) {
            case "diff":
                waitingDialogTitle = i18n.getMessage("backupDiffAll");
                break;
            case "dump":
                waitingDialogTitle = i18n.getMessage("backupDumpAll");
                break;
        }

        const waitingDialog = this.setupCliDialogAndShow(
            {
                title: waitingDialogTitle,
                buttonCancelCallback: null
            });

        // const saveFailedDialogSettings = {
        //     title: i18n.getMessage("warningTitle"),
        //     text: i18n.getMessage("backupWaitDialogMessageErrorSavingBackup"),
        //     buttonConfirmText: i18n.getMessage("close"),
        // };

        await this.activateCli();

        await this.performBackup(backupType);

       
                const prefix = 'backup_' + backupType;
                const suffix = '.txt';
                try {
                    await filesystem.writeTextFile(this.#cliEngine.outputHistory, {
                        suggestedName: generateFilename(prefix, suffix),
                        description: `${suffix.toUpperCase()} files`,
                    });
                } catch (err) {
                    console.log('Failed to save backup', err);
                }

            waitingDialog.close();
            await new Promise((resolve) => this.#cliEngine.sendLine("exit", resolve));
    };

    performBackup(backupType) {
        const self = this;
        let lastCliStringReceived = performance.now();

        const readingDumpIntervalName = "PRESETS_BACKUP_INTERVAL";
        this.#cliEngine.subscribeResponseCallback(() => {
            lastCliStringReceived = performance.now();
        });

        switch (backupType) {
            case "diff":
                this.#cliEngine.sendLine(COMMAND_DIFF_ALL);
                break;
            case "dump":
                this.#cliEngine.sendLine(COMMAND_DUMP_ALL);
                break;
            default:
                return;

        }

        return new Promise(resolve => {
            GUI.interval_add(readingDumpIntervalName, () => {
                const currentTime = performance.now();
                if (currentTime - lastCliStringReceived > 500) {
                    GUI.interval_remove(readingDumpIntervalName);
                    resolve(self.#cliEngine.outputHistory);
                }
            }, 500, false);
        });
    };

    async onBackupLoadClick() {
        try {
            const file = await window.filesystem.readTextFile({
                description: "Backup files",
                extensions: [".txt", ".config"],
            });
            if (!file) return;

            console.log("Read file: " + file.name);
            const pickedPreset = new PresetInstance({ title: "user configuration", cliStringsArr: file.content.split("\n") }, undefined);
            this.#presetInstances.push(pickedPreset);
            this.onSaveClick();

        } catch (err) {
            console.log("Failed to load config", err);
        }
    };

    async onHtmlLoad(callback) {
        i18n.localizePage();
        this.adaptPhones();
        this.#readDom();
        this.setupMenuButtons();
        this.setupBackupWarning();
        this.#dom.inputTextFilter.attr("placeholder", "Example: \"OMPHOBBY M5\", or \"OMPHOBBY M7\"");

        this.presetsDetailedDialog = new PresetDialog($("#presets_detailed_dialog"), () => { this.enableSaveCancelButtons(true); }, this.#favoritePresets);

        this.presetsSourcesDialog = new Sources("#presets_sources_dialog");

        await this.presetsDetailedDialog.initialize();
        await this.presetsSourcesDialog.load();

        await this.tryLoadPresets();
        GUI.content_ready(callback);
    };


    // activateCli returns a new Promise that resolves when the CLI engine is ready
    activateCli() {
        return new Promise((resolve) => {
            CONFIGURATOR.cliEngineActive = true;
            CONFIGURATOR.cliTab = 'presets';
            this.#cliEngine.setUi($('#presets_cli_dialog .window'), $('#presets_cli_dialog .window .wrapper'), $('#presets_cli_dialog textarea[name="commands"]'));
            this.#cliEngine.enterCliMode();

            const waitForValidCliEngine = setInterval(() => {
                if (CONFIGURATOR.cliEngineActive) {
                    clearInterval(waitForValidCliEngine);
                    GUI.timeout_add('presets_enter_cli_mode_done', () => {
                        resolve();
                    }, 500);
                }
            }, 500);
        });
    };

    async reload() {
        this.resetInitialValues();
        await this.tryLoadPresets();
    };

    async tryLoadPresets() {
        console.log("Attempting to load presets");
        const activeSources = this.presetsSourcesDialog.collectActiveSources();
        this.activePresetsSources = [];
        for (let i = 0; i < activeSources.length; i++) {
            this.activePresetsSources.push(activeSources[i]);
        }

        this.#dom.divMainContent.toggle(false);
        this.#dom.divGlobalLoadingError.toggle(false);
        this.#dom.divGlobalLoading.toggle(true);
        this.#dom.warningNotOfficialSource.toggle(this.presetsSourcesDialog.isThirdPartyActive);

        const failedToLoad = [];

        for (let i = 0; i < this.activePresetsSources.length; i++) {
            try {
                await this.activePresetsSources[i].loadData();
            } catch (err) {
                console.error(err);
                failedToLoad.push(this.activePresetsSources[i]);
            }
        }
        try {
                this.#dom.warningFailedToLoadRepositories.toggle(failedToLoad.length > 0);
                this.#dom.warningFailedToLoadRepositories.html(i18n.getMessage("presetsFailedToLoadRepositories", { "repos": failedToLoad.map(repo => repo.metadata.name).join(", ") }));
                this.activePresetsSources = this.activePresetsSources.filter(repo => !failedToLoad.includes(repo));
                await this.checkPresetSourceVersion();
                this.#prepareFilterFields();
                this.#dom.divGlobalLoading.toggle(false);
                this.#dom.divMainContent.toggle(true);
        }
        catch (err) {
                this.#dom.divGlobalLoading.toggle(false);
                this.#dom.divGlobalLoadingError.toggle(true);
                console.log("uhoh");
                console.error(err);
        }
    };

    multipleSelectComponentScrollFix() {
        /*
            A hack for multiple select that fixes scrolling problem
            when the number of items 199+. More details here:
            https://github.com/wenzhixin/multiple-select/issues/552
        */
        return new Promise((resolve) => {
            GUI.timeout_add('hack_fix_multipleselect_scroll', () => {
                this.#dom.selectCategory.multipleSelect('refresh');
                this.#dom.selectKeyword.multipleSelect('refresh');
                this.#dom.selectAuthor.multipleSelect('refresh');
                this.#dom.selectFirmwareVersion.multipleSelect('refresh');
                this.#dom.selectStatus.multipleSelect('refresh');
                resolve();
            }, 100);
        });
    };

    checkPresetSourceVersion() {
        const self = this;

        return new Promise((resolve, reject) => {
            const differentMajorVersionsRepos = self.activePresetsSources.filter(source => self.majorVersion !== source.index.majorVersion);
            if (differentMajorVersionsRepos.length === 0) {
                resolve();
            } else {
                const versionRequired = `${self.majorVersion}.X`;
                const versionSource = `${differentMajorVersionsRepos[0].index.majorVersion}.${differentMajorVersionsRepos[0].index.minorVersion}`;

                const dialogSettings = {
                    title: i18n.getMessage("presetsWarningDialogTitle"),
                    text: i18n.getMessage("presetsVersionMismatch", { "versionRequired": versionRequired, "versionSource": versionSource }),
                    buttonYesText: i18n.getMessage("yes"),
                    buttonNoText: i18n.getMessage("no"),
                    buttonYesCallback: () => resolve(),
                    buttonNoCallback: () => reject("Preset source version mismatch"),
                };

                GUI.showYesNoDialog(dialogSettings);
            }
        });
    };

    #prepareFilterFields() {

        function getUniqueValues(objects, extractor) {
            let values = objects.map(extractor);
            let uniqueValues = [...values.reduce((a, b) => new Set([...a, ...b]), new Set())];
            return uniqueValues.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        }

        this.freezeSearch = true;

        this.#prepareFilterSelectField(this.#dom.selectCategory, getUniqueValues(this.activePresetsSources, x => x.index.uniqueValues.category), 3);
        this.#prepareFilterSelectField(this.#dom.selectKeyword, getUniqueValues(this.activePresetsSources, x => x.index.uniqueValues.keywords), 3);
        this.#prepareFilterSelectField(this.#dom.selectAuthor, getUniqueValues(this.activePresetsSources, x => x.index.uniqueValues.author), 1);
        this.#prepareFilterSelectField(this.#dom.selectFirmwareVersion, getUniqueValues(this.activePresetsSources, x => x.index.uniqueValues.firmware_version), 2);
        this.#prepareFilterSelectField(this.#dom.selectStatus, getUniqueValues(this.activePresetsSources, x => x.index.settings.PresetStatusEnum), 2);

        this.multipleSelectComponentScrollFix().then(() => {
            this.#preselectFilterFields();
            this.#dom.inputTextFilter.on('input', () => this.#updateSearchResults());
            this.freezeSearch = false;
            this.#updateSearchResults();
        });
    };

    #preselectFilterFields() {
        const currentVersion = FC.CONFIG.flightControllerVersion;
        const selectedVersions = [];

        for (const source of this.activePresetsSources) {
            for (const bfVersion of source.index.uniqueValues.firmware_version) {
                if (currentVersion.startsWith(bfVersion)) {
                    selectedVersions.push(bfVersion);
                }
            }
        }

        this.#dom.selectFirmwareVersion.multipleSelect('setSelects', selectedVersions);
    };

    #prepareFilterSelectField(domSelectElement, selectOptions, minimumCountSelected) {
        domSelectElement.multipleSelect("destroy");
        domSelectElement.multipleSelect({
            data: selectOptions,
            showClear: true,
            minimumCountSelected: minimumCountSelected,
            placeholder: i18n.getMessage("dropDownFilterDisabled"),
            onClick: () => { this.#updateSearchResults(); },
            onCheckAll: () => { this.#updateSearchResults(); },
            onUncheckAll: () => { this.#updateSearchResults(); },
            formatSelectAll() { return i18n.getMessage("dropDownSelectAll"); },
            formatAllSelected() { return i18n.getMessage("dropDownAll"); },
        });
    };

    #updateSearchResults() {
        if (!this.freezeSearch) {
            const searchParams = {
                categories: this.#dom.selectCategory.multipleSelect("getSelects", "text"),
                keywords: this.#dom.selectKeyword.multipleSelect("getSelects", "text"),
                authors: this.#dom.selectAuthor.multipleSelect("getSelects", "text"),
                firmwareVersions: this.#dom.selectFirmwareVersion.multipleSelect("getSelects", "text"),
                status: this.#dom.selectStatus.multipleSelect("getSelects", "text"),
                searchString: this.#dom.inputTextFilter.val().trim(),
            };

            this.#updateSelectStyle();
            searchParams.authors = searchParams.authors.map(str => str.toLowerCase());
            console.log("updating the dsearch results");
            this.#displayPresets(this.#searchPresets(searchParams));
        }
    };

    #updateSelectStyle() {
        this.#updateSingleSelectStyle(this.#dom.selectCategory);
        this.#updateSingleSelectStyle(this.#dom.selectKeyword);
        this.#updateSingleSelectStyle(this.#dom.selectAuthor);
        this.#updateSingleSelectStyle(this.#dom.selectFirmwareVersion);
        this.#updateSingleSelectStyle(this.#dom.selectStatus);
    };

    #updateSingleSelectStyle(select) {
        const selectedOptions = select.multipleSelect("getSelects", "text");
        const isSomethingSelected = (0 !== selectedOptions.length);
        select.parent().find($(".ms-choice")).toggleClass("presets_filter_select_nonempty", isSomethingSelected);
    };

    #displayPresets(presets) {
        
        this.presetsPanels.forEach(presetPanel => {
            presetPanel.remove();
        });
        this.presetsPanels = [];

        const maxPresetsToShow = 60;
        this.#dom.listTooManyFound.toggle(presets.length > maxPresetsToShow);
        presets.length = Math.min(presets.length, maxPresetsToShow);

        this.#dom.listNoFound.toggle(presets.length === 0);

        presets.forEach(preset => {
            const presetPanel = new PresetPanel(this.#dom.divPresetList, preset[0], preset[1], true, this.presetsSourcesDialog.isThirdPartyActive, this.#presetSelected(preset[0], preset[1]), this.#favoritePresets);
            presetPanel.load();
            this.presetsPanels.push(presetPanel);
            presetPanel.subscribeClick(this.presetsDetailedDialog, this.#presetInstances);
        });

        this.#dom.listTooManyFound.appendTo(this.#dom.divPresetList);
    };

    /**
     * 
     * @param {PresetData} presetData 
     * @param {Source} source 
     * @returns 
     */
    #presetSelected(presetData, source) {
        let presetFound = false;
        this.#presetInstances.forEach(pi => {
            if (pi.presetData.hash === presetData.hash && pi.sourceMetadata.rawUrl === source.rawUrl) {
                presetFound = true;
            }
        });
        return presetFound;
    }

    #searchPresets(searchParams) {
        const matchingPresets = [];
        const seenHashes = new Set();

        for (const source of this.activePresetsSources) {
            for (const preset of source.index.presets) {
                if ((this.#presetMatchesSearch(preset, searchParams) || this.#presetSelected(preset, source)) && !seenHashes.has(preset.hash)) {
                    matchingPresets.push([preset, source]);
                    seenHashes.add(preset.hash);
                }
            }
        }

        matchingPresets.sort((a, b) => this.#presetSearchPriorityComparer(a[0], b[0]));

        return matchingPresets;
    };

    #presetSearchPriorityComparer(presetA, presetB) {
        if (presetA.lastPickDate && presetB.lastPickDate) {
            return presetB.lastPickDate - presetA.lastPickDate;
        }

        if (presetA.lastPickDate || presetB.lastPickDate) {
            return (presetA.lastPickDate) ? -1 : 1;
        }

        return (presetA.priority > presetB.priority) ? -1 : 1;
    };

    /**
     * 
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesStatuses(preset, searchParams) {
        return 0 === searchParams.status.length || searchParams.status.includes(preset.status);
    };

    /**
     * 
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesSearchCategories(preset, searchParams) {
        if (0 !== searchParams.categories.length) {
            if (undefined === preset.category) {
                return false;
            }

            if (!searchParams.categories.includes(preset.category)) {
                return false;
            }
        }

        return true;
    };

    /**
     * 
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesBoardName(preset) {
            if (undefined === preset.board_name || FC.CONFIG.boardName == '') {
                console.log("board name not found!");
                return true;
            }

            let boardNameMatches = false;
            preset.board_name.forEach(boardName => {
                console.log("checking board name: " + boardName + " vs: FC : " + FC.CONFIG.boardName);
                if (FC.CONFIG.boardName === boardName) {
                    boardNameMatches = true;
                }
            });

        return boardNameMatches;
    };

    /**
     * 
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesSearchKeyboards(preset, searchParams) {
        if (0 !== searchParams.keywords.length) {
            if (!Array.isArray(preset.keywords)) {
                return false;
            }

            const keywordsIntersection = searchParams.keywords.filter(value => preset.keywords.includes(value));
            if (0 === keywordsIntersection.length) {
                return false;
            }
        }

        return true;
    };

    /**
     * 
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesAuthors(preset, searchParams) {
        if (0 !== searchParams.authors.length) {
            if (undefined === preset.author) {
                return false;
            }

            if (!searchParams.authors.includes(preset.author.toLowerCase())) {
                return false;
            }
        }

        return true;
    };

    /**
     * 
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesFirmwareVersions(preset, searchParams) {
        if (0 !== searchParams.firmwareVersions.length) {
            if (!Array.isArray(preset.firmware_version)) {
                return false;
            }

            const firmwareVersionsIntersection = searchParams.firmwareVersions.filter(value => preset.firmware_version.includes(value));
            if (0 === firmwareVersionsIntersection.length) {
                return false;
            }
        }

        return true;
    };


    /**
     * 
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesSearchString(preset, searchParams) {
        if (searchParams.searchString) {
            const allKeywords = preset.keywords.join(" ");
            const allVersions = preset.firmware_version.join(" ");
            const totalLine = [preset.description, allKeywords, preset.title, preset.author, allVersions, preset.category].join("\n").toLowerCase().replace("''", "\"");
            const allWords = searchParams.searchString.toLowerCase().replace("''", "\"").split(" ");

            for (const word of allWords) {
                if (!totalLine.includes(word)) {
                    return false;
                }
            }
        }

        return true;
    };


    /**
     * @param {PresetData} preset 
     * @param {*} searchParams 
     * @returns 
     */
    #presetMatchesSearch(preset, searchParams) {
        if (preset.hidden) {
            return false;
        }

        if (!this.#presetMatchesStatuses(preset, searchParams)) {
            return false;
        }

        if (!this.#presetMatchesSearchCategories(preset, searchParams)) {
            return false;
        }

        if (!this.#presetMatchesSearchKeyboards(preset, searchParams)) {
            return false;
        }

        if (!this.#presetMatchesAuthors(preset, searchParams)) {
            return false;
        }

        if (!this.#presetMatchesFirmwareVersions(preset, searchParams)) {
            return false;
        }

        if (!this.#presetMatchesSearchString(preset, searchParams)) {
            return false;
        }

        if (!this.#presetMatchesBoardName(preset)) {
            return false;
        }

        return true;
    };

    adaptPhones() {
        if ($(window).width() < 575) {
            const backdropHeight = $('.note').height() + 22 + 38;
            $('.backdrop').css('height', `calc(100% - ${backdropHeight}px)`);
        }

        if (GUI.isCordova()) {
            UI_PHONES.initToolbar();
        }
    };

    read(readInfo) {
        this.#cliEngine.readSerial(readInfo);
    };

    cleanup(callback) {
        this.resetInitialValues();

        if (!(CONFIGURATOR.connectionValid && CONFIGURATOR.cliEngineActive && CONFIGURATOR.cliEngineValid)) {
            if (callback) {
                callback();
            }

            return;
        }

        TABS.presets.#cliEngine.close(() => {
            if (callback) {
                callback();
            }
        });
    };

    resetInitialValues() {
        CONFIGURATOR.cliEngineActive = false;
        CONFIGURATOR.cliEngineValid = false;
        CONFIGURATOR.cliTab = '';
        TABS.presets.activePresetsSources = [];
        TABS.presets.#presetInstances = [];
        //this.domProgressDialog.close();
    };
};

TABS['presets'] = new PresetsTab();

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        if (newModule && GUI.active_tab === 'presets') {
            TABS['presets'].initialize();
        }
    });

    import.meta.hot.dispose(() => {
        TABS['presets'].cleanup();
    });
}
