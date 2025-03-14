import CliEngine from '@/js/cli_engine.js';
import PickedPreset from '@/js/presets/picked_preset.js';
import PresetsDetailsDialog from '@/js/presets/dialog/preset_details.js';
import PresetsGithubRepo from '@/js/presets/sources/presets_source_github.js';
import PresetsSourceHttp from '@/js/presets/sources/presets_source_http.js';
import PresetTitlePanel from '@/js/presets/panels/title_panel.js';
import PresetsSourcesDialog from '@/js/presets/dialog/presets_sources.js';
import PresetsSourceUtil from '@/js/presets/sources/presets_source_util.js';
import FavoritePresetsClass from '@/js/presets/favorites.js';

const tab = {
    tabName: 'presets',
    presetsSources: [],
    cliEngine: null,
    pickedPresetList: [],
    majorVersion: 1,
    favoritePresets: null,
};

tab.initialize = function (callback) {
    const self = this;

    self.cliEngine = new CliEngine(self);
    self.cliEngine.setProgressCallback(value => this.onApplyProgressChange(value));
    self.presetPanels = [];
    self.favoritePresets = new FavoritePresetsClass();
    self.favoritePresets.loadFromStorage();

    $('#content').load("/src/tabs/presets/presets.html", () => self.onHtmlLoad(callback));

    if (GUI.active_tab !== 'presets') {
        GUI.active_tab = 'presets';
    }
};

tab.readDom = function read() {
    this.divGlobalLoading = $('#presets_global_loading');
    this.divGlobalLoadingError = $('#presets_global_loading_error');
    this.divCli = $('#presets_cli');
    this.divMainContent = $('#presets_main_content');
    this.selectCategory = $('#presets_filter_category');
    this.selectKeyword = $('#presets_filter_keyword');
    this.selectAuthor = $('#presets_filter_author');
    this.selectFirmwareVersion = $('#presets_filter_firmware_version');
    this.selectStatus = $('#presets_filter_status');
    this.inputTextFilter = $('#presets_filter_text');
    this.divPresetList = $('#presets_list');

    this.domButtonSave = $("#presets_save_button");
    this.domButtonCancel = $("#presets_cancel_button");

    this.domReloadButton = $("#presets_reload");
    this.domContentWrapper = $("#presets_content_wrapper");

    // CLI Dialog
    this.domDialogCli = $("#presets_cli_dialog");
    this.domButtonCliExit = $("#presets_cli_exit_button");
    this.domButtonCliSave = $("#presets_cli_save_button");
    this.domDialogCli = $("#presets_cli_dialog");
    this.domProgressDialogProgressBar = $(".presets_apply_progress_dialog_progress_bar");
    this.domDialogCliWarning = $(".presets_cli_errors_dialog_warning");

    this.domButtonBackupDiffAll = $(".backup_diff_all");
    this.domButtonBackupDumpAll = $(".backup_dump_all");
    this.domButtonBackupLoad = $(".backup_load");
    this.domButtonPresetSources = $(".presets_sources_show");

    this.domWarningNotOfficialSource = $(".presets_warning_not_official_source");
    this.domWarningFailedToLoadRepositories = $(".presets_failed_to_load_repositories");
    this.domWarningBackup = $(".presets_warning_backup");
    this.domButtonHideBackupWarning = $(".presets_warning_backup_button_hide");

    this.domListNoFound = $("#presets_list_no_found");
    this.domListTooManyFound = $("#presets_list_too_many_found");
};

tab.getPickedPresetsCli = function() {
    let result = [];
    this.pickedPresetList.forEach(pickedPreset => {
        result.push(...pickedPreset.presetCli);
    });
    result = result.filter(command => command.trim() !== "");
    return result;
};

tab.onApplyProgressChange = function(value) {
    this.domProgressDialogProgressBar.val(value);
};

tab.applyCommandsList = function(strings) {
    strings.forEach(cliCommand => {
        this.cliEngine.sendLine(cliCommand);
    });
};

tab.previewCommands = async function() {
            const previewArea = $("#snippetpreviewcontent textarea#preview");

            function executeSnippet() {
                const commands = previewArea.val();
                self.cliEngine.executeCommands(commands);
                this.GUI.snippetPreviewWindow.close();
            }

            function previewCommands(result, fileName) {
                if (!self.GUI.snippetPreviewWindow) {
                    self.GUI.snippetPreviewWindow = new jBox("Modal", {
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
                self.GUI.snippetPreviewWindow.open();
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

tab.onSaveClick = async function () {
    const self = this;
    const cliCommandsArray = this.getPickedPresetsCli();

    const previewArea = $("#snippetpreviewcontent textarea#preview");

    async function executeSnippet() {
        try {
            const { commands, initialCliErrorCount } = await self.activateCli().then(() => {
                return new Promise((resolve) => {
                    const initialCliErrorCount = self.cliEngine.errorsCount;
                    self.setupCliDialogAndShow({
                        title: i18n.getMessage("presetsApplyingPresets"),
                        buttonCancelCallback: null,
                    });
                    self.domProgressDialogProgressBar.show();
                    self.domProgressDialogProgressBar.val(0);
                    const commands = previewArea.val();
                    self.snippetPreviewWindow.close();
                    resolve({commands, initialCliErrorCount});
                });
            });
    
            console.log("new promise with commands: " + commands);
    
            await self.cliEngine.executeCommands(commands).then(() => {
                return { initialCliErrorCount }; // Pass values forward
            }).then(({ initialCliErrorCount }) => {
                console.log("finished running commands, new error count " + self.cliEngine.errorsCount + " and old: " + initialCliErrorCount);
                self.domProgressDialogProgressBar.hide();
                if (self.cliEngine.errorsCount !== initialCliErrorCount) {
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
        self.domButtonCliSave.off("click");
        self.domButtonCliSave.on("click", () =>{
            self.cliEngine.subscribeResponseCallback(() => {
                self.cliEngine.unsubscribeResponseCallback();
                if (self.cliEngine.inBatchMode() && errorsEncountered) {
                    // In case of batch CLI command errors, the firmware requires extra "save" command for CLI safety.
                    // No need for this safety in presets as preset tab already detected errors and showed them to the user.
                    // At this point user clicked "save anyway".
                    self.cliEngine.sendLine(CliEngine.s_commandSave);
                }
            });
            self.cliEngine.sendLine(CliEngine.s_commandSave);
            self.domDialogCli[0].close();
        });
        self.domButtonCliSave.show();
        
        self.domButtonCliExit.off("click");
        self.domButtonCliExit.on("click", () =>{
            self.domDialogCli[0].close();
        });
        self.domButtonCliExit.show();

        self.domDialogCli.on("close", () => {
            self.cliEngine.sendLine(CliEngine.s_commandExit);
            self.disconnectCliMakeSure();
            self.domDialogCliWarning.hide();
            self.domButtonCliSave.hide();
            self.domButtonCliExit.hide();
            self.domDialogCli.off("close");
            self.domButtonCliSave.off("click");
            self.domButtonCliExit.off("click");
        });
    }

    self.markPickedPresetsAsFavorites();
    previewCommands(cliCommandsArray);
};

tab.disconnectCliMakeSure = function() {
    GUI.timeout_add('disconnect', function () {
        $('div.connect_controls a.connect').trigger( "click" );
    }, 500);
};

tab.markPickedPresetsAsFavorites = function() {
    for (const pickedPreset of this.pickedPresetList) {
        if (pickedPreset.presetRepo !== undefined){
            this.favoritePresets.add(pickedPreset.preset, pickedPreset.presetRepo);
        }
    }

    this.favoritePresets.saveToStorage();
};

tab.setupCliDialogAndShow = function(cliDialogSettings) {
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

    this.domDialogCli[0].showModal();
    return this.domDialogCli[0];
};


tab.setupMenuButtons = function() {
    this.domButtonSave.on("click", () => this.onSaveClick());


    this.domButtonCancel.on("click", () => {
        for (const pickedPreset of this.pickedPresetList) {
            pickedPreset.preset.isPicked = false;
        }

        this.updateSearchResults();
        this.pickedPresetList.length = 0;
        this.enableSaveCancelButtons(false);
    });

    this.domButtonBackupDiffAll.on("click", () => this.onSaveBackupClick("diff"));
    this.domButtonBackupDumpAll.on("click", () => this.onSaveBackupClick("dump"));
    this.domButtonBackupLoad.on("click", () => this.onBackupLoadClick());

    this.domButtonPresetSources.on("click", () => this.onPresetSourcesShowClick());
    this.domButtonHideBackupWarning.on("click", () => this.onButtonHideBackupWarningClick());

    this.domButtonSave.toggleClass(GUI.buttonDisabledClass, false);
    this.domButtonCancel.toggleClass(GUI.buttonDisabledClass, false);
    this.domReloadButton.on("click", () => this.reload());

    this.enableSaveCancelButtons(false);

};

tab.enableSaveCancelButtons = function (isEnabled) {
    this.domButtonSave.toggleClass(GUI.buttonDisabledClass, !isEnabled);
    this.domButtonCancel.toggleClass(GUI.buttonDisabledClass, !isEnabled);
};

tab.onButtonHideBackupWarningClick = function() {
    this.domWarningBackup.toggle(false);
    ConfigStorage.set({'showPresetsWarningBackup': false});
};

tab.setupBackupWarning = function() {
    let showPresetsWarningBackup = false;
    ConfigStorage.get('showPresetsWarningBackup', function (result) {
        if (result.showPresetsWarningBackup) {
            showPresetsWarningBackup = true;
        } else if (showPresetsWarningBackup === undefined) {
            showPresetsWarningBackup = true;
        }
    });

    const warningVisible = !!showPresetsWarningBackup;
    this.domWarningBackup.toggle(warningVisible);
};

tab.onPresetSourcesShowClick = function() {
    this.presetsSourcesDialog.show().then(() => {
        this.reload();
    });
};

tab.onSaveBackupClick = async function(backupType) {
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

    const saveFailedDialogSettings = {
        title: i18n.getMessage("warningTitle"),
        text: i18n.getMessage("backupWaitDialogMessageErrorSavingBackup"),
        buttonConfirmText: i18n.getMessage("close"),
    };

    this.activateCli()
    .then(() => this.performBackup(backupType))
    .then(backupContent => async function(backupContent) {
        const prefix = 'backup_' + backupType;;
        const suffix = '.txt';
        try {
            await window.filesystem.writeTextFile(backupContent, {
                suggestedName: generateFilename(prefix, suffix),
                description: `${suffix.toUpperCase()} files`,
            });
          } catch (err) {
              console.log('Failed to save backup', err);
          }
    }(backupContent))
    .then(() => {
        waitingDialog.close();
        this.cliEngine.sendLine(CliEngine.s_commandExit);
    })
    .catch(() => {
        waitingDialog.close();
        return GUI.showInformationDialog(saveFailedDialogSettings); // TODO: fix this casue it don't work
    })
    .then(() => this.cliEngine.sendLine(CliEngine.s_commandExit));
};

const COMMAND_DIFF_ALL = "diff all";
const COMMAND_DUMP_ALL = "dump all";

tab.performBackup = function(backupType) {
    const self = this;
    let lastCliStringReceived = performance.now();

    const readingDumpIntervalName = "PRESETS_BACKUP_INTERVAL";
    this.cliEngine.subscribeResponseCallback(() => {
        lastCliStringReceived = performance.now();
    });

    switch (backupType) {
        case "diff":
            this.cliEngine.sendLine(COMMAND_DIFF_ALL);
            break;
        case "dump":
            this.cliEngine.sendLine(COMMAND_DUMP_ALL);
            break;
        default:
            return;

    }

    return new Promise(resolve => {
        GUI.interval_add(readingDumpIntervalName, () => {
            const currentTime = performance.now();
            if (currentTime - lastCliStringReceived > 500) {
                GUI.interval_remove(readingDumpIntervalName);
                resolve(self.cliEngine.outputHistory());
            }
        }, 500, false);
    });
};

tab.onBackupLoadClick = async function() {
    try {
        const file = await window.filesystem.readTextFile({
            description: "Backup files",
            extensions: [".txt", ".config"],
        });
        if (!file) return;
        
        console.log("Read file: " + file.name);
        const cliStrings = file.content.split("\n");
        const pickedPreset = new PickedPreset({title: "user configuration"}, cliStrings, undefined);
        this.pickedPresetList.push(pickedPreset);
        this.onSaveClick();
            
    } catch (err) {
        console.log("Failed to load config", err);
    }
};

tab.onHtmlLoad = async function(callback) {
    i18n.localizePage();
    TABS.presets.adaptPhones();
    this.readDom();
    this.setupMenuButtons();
    this.setupBackupWarning();
    this.inputTextFilter.attr("placeholder", "Example: \"OMPHOBBY M5\", or \"OMPHOBBY M7\"");

    this.presetsDetailedDialog = new PresetsDetailsDialog($("#presets_detailed_dialog"), this.pickedPresetList, () => this.onPresetPickedCallback(), this.favoritePresets);
    this.presetsSourcesDialog = new PresetsSourcesDialog($("#presets_sources_dialog"));

    await this.presetsDetailedDialog.load();
    await this.presetsSourcesDialog.load();
    this.tryLoadPresets();
    GUI.content_ready(callback);
};

tab.onPresetPickedCallback = function() {
    this.enableSaveCancelButtons(true);
};


// activateCli returns a new Promise that resolves when the CLI engine is ready
tab.activateCli = function() {
    return new Promise((resolve) => {
        CONFIGURATOR.cliEngineActive = true;
        CONFIGURATOR.cliTab = 'presets';
        this.cliEngine.setUi($('#presets_cli_dialog .window'), $('#presets_cli_dialog .window .wrapper'), $('#presets_cli_dialog textarea[name="commands"]'));
        this.cliEngine.enterCliMode();

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

tab.reload = function() {
    this.resetInitialValues();
    this.tryLoadPresets();
};

tab.tryLoadPresets = function() {
    const presetSources = this.presetsSourcesDialog.getActivePresetSources();

    this.presetsRepo = presetSources.map(source => {
        if (PresetsSourceUtil.isUrlGithubRepo(source.url)) {
            return new PresetsGithubRepo(source.url, source.gitHubBranch, source.official, source.name);
        } else {
            return new PresetsSourceHttp(source.url, source.official, source.name);
        }
    });

    this.divMainContent.toggle(false);
    this.divGlobalLoadingError.toggle(false);
    this.divGlobalLoading.toggle(true);
    this.domWarningNotOfficialSource.toggle(this.presetsSourcesDialog.isThirdPartyActive);

    const failedToLoad = [];

    Promise.all(this.presetsRepo.map(p => p.loadIndex().catch((failedToLoad.push(p)))))
    .then(() => {
        this.domWarningFailedToLoadRepositories.toggle(failedToLoad.length > 0);
        this.domWarningFailedToLoadRepositories.html(i18n.getMessage("presetsFailedToLoadRepositories", {"repos": failedToLoad.map(repo => repo.name).join("; ")}));
        this.presetsRepo = this.presetsRepo.filter(repo => !failedToLoad.includes(repo));
        return this.checkPresetSourceVersion();
    })
    .then(() => {
        this.presetsRepo.forEach(p => this.favoritePresets.addLastPickDate(p.index.presets, p));
        this.prepareFilterFields();
        this.divGlobalLoading.toggle(false);
        this.divMainContent.toggle(true);
    }).catch(err => {
        this.divGlobalLoading.toggle(false);
        this.divGlobalLoadingError.toggle(true);
        console.error(err);
    });
};

tab.multipleSelectComponentScrollFix = function() {
    /*
        A hack for multiple select that fixes scrolling problem
        when the number of items 199+. More details here:
        https://github.com/wenzhixin/multiple-select/issues/552
    */
   return new Promise((resolve) => {
    GUI.timeout_add('hack_fix_multipleselect_scroll', () => {
        this.selectCategory.multipleSelect('refresh');
        this.selectKeyword.multipleSelect('refresh');
        this.selectAuthor.multipleSelect('refresh');
        this.selectFirmwareVersion.multipleSelect('refresh');
        this.selectStatus.multipleSelect('refresh');
        resolve();
    }, 100);
   });
};

tab.checkPresetSourceVersion = function() {
    const self = this;

    return new Promise((resolve, reject) => {
        const differentMajorVersionsRepos = self.presetsSources.filter(pr => self.majorVersion !== pr.index.majorVersion);
        if (differentMajorVersionsRepos.length === 0) {
            resolve();
        } else {
            const versionRequired = `${self.majorVersion}.X`;
            const versionSource = `${differentMajorVersionsRepos[0].index.majorVersion}.${differentMajorVersionsRepos[0].index.minorVersion}`;

            const dialogSettings = {
                title: i18n.getMessage("presetsWarningDialogTitle"),
                text: i18n.getMessage("presetsVersionMismatch", {"versionRequired": versionRequired, "versionSource":versionSource}),
                buttonYesText: i18n.getMessage("yes"),
                buttonNoText: i18n.getMessage("no"),
                buttonYesCallback: () => resolve(),
                buttonNoCallback: () => reject("Preset source version mismatch"),
            };

            GUI.showYesNoDialog(dialogSettings);
        }
    });
};

function getUniqueValues(objects, extractor) {
    let values = objects.map(extractor);
    let uniqueValues = [...values.reduce((a, b) => new Set([...a, ...b]), new Set())];
    return uniqueValues.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
}

tab.prepareFilterFields = function() {
    this.freezeSearch = true;

    this.prepareFilterSelectField(this.selectCategory, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.category), 3);
    this.prepareFilterSelectField(this.selectKeyword, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.keywords), 3);
    this.prepareFilterSelectField(this.selectAuthor, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.author), 1);
    this.prepareFilterSelectField(this.selectFirmwareVersion, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.firmware_version), 2);
    this.prepareFilterSelectField(this.selectStatus, getUniqueValues(this.presetsRepo, x => x.index.settings.PresetStatusEnum), 2);

    this.multipleSelectComponentScrollFix().then(() => {
        this.preselectFilterFields();
        this.inputTextFilter.on('input', () => this.updateSearchResults());
        this.freezeSearch = false;
        this.updateSearchResults();
    });
};

tab.preselectFilterFields = function() {
    const currentVersion = FC.CONFIG.flightControllerVersion;
    const selectedVersions = [];

    for (const repo of this.presetsSources) {
        for (const bfVersion of repo.index.uniqueValues.firmware_version) {
            if (currentVersion.startsWith(bfVersion)) {
                selectedVersions.push(bfVersion);
            }
        }
    }

    this.selectFirmwareVersion.multipleSelect('setSelects', selectedVersions);
};

tab.prepareFilterSelectField = function(domSelectElement, selectOptions, minimumCountSelected) {
    domSelectElement.multipleSelect("destroy");
    domSelectElement.multipleSelect({
        data: selectOptions,
        showClear: true,
        minimumCountSelected : minimumCountSelected,
        placeholder: i18n.getMessage("dropDownFilterDisabled"),
        onClick: () => { this.updateSearchResults(); },
        onCheckAll: () => { this.updateSearchResults(); },
        onUncheckAll: () => { this.updateSearchResults(); },
        formatSelectAll() { return i18n.getMessage("dropDownSelectAll"); },
        formatAllSelected() { return i18n.getMessage("dropDownAll"); },
    });
};

tab.updateSearchResults = function() {
    if (!this.freezeSearch)
    {
        const searchParams = {
            categories: this.selectCategory.multipleSelect("getSelects", "text"),
            keywords: this.selectKeyword.multipleSelect("getSelects", "text"),
            authors: this.selectAuthor.multipleSelect("getSelects", "text"),
            firmwareVersions: this.selectFirmwareVersion.multipleSelect("getSelects", "text"),
            status: this.selectStatus.multipleSelect("getSelects", "text"),
            searchString: this.inputTextFilter.val().trim(),
        };

        this.updateSelectStyle();
        searchParams.authors = searchParams.authors.map(str => str.toLowerCase());
        const fitPresets = this.getFitPresets(searchParams);
        this.displayPresets(fitPresets);
    }
};

tab.updateSelectStyle = function() {
    this.updateSingleSelectStyle(this.selectCategory);
    this.updateSingleSelectStyle(this.selectKeyword);
    this.updateSingleSelectStyle(this.selectAuthor);
    this.updateSingleSelectStyle(this.selectFirmwareVersion);
    this.updateSingleSelectStyle(this.selectStatus);
};

tab.updateSingleSelectStyle = function(select) {
    const selectedOptions = select.multipleSelect("getSelects", "text");
    const isSomethingSelected = (0 !== selectedOptions.length);
    select.parent().find($(".ms-choice")).toggleClass("presets_filter_select_nonempty", isSomethingSelected);
};

tab.displayPresets = function(fitPresets) {
    this.presetPanels.forEach(presetPanel => {
        presetPanel.remove();
    });
    this.presetPanels = [];

    const maxPresetsToShow = 60;
    this.domListTooManyFound.toggle(fitPresets.length > maxPresetsToShow);
    fitPresets.length = Math.min(fitPresets.length, maxPresetsToShow);

    this.domListNoFound.toggle(fitPresets.length === 0);

    fitPresets.forEach(preset => {
        const presetPanel = new PresetTitlePanel(this.divPresetList, preset[0], preset[1], true, this.presetsSourcesDialog.isThirdPartyActive, this.favoritePresets);
        presetPanel.load();
        this.presetPanels.push(presetPanel);
        presetPanel.subscribeClick(this.presetsDetailedDialog, preset[1]);
    });

    this.domListTooManyFound.appendTo(this.divPresetList);
};


tab.getFitPresets = function(searchParams) {
    const result = [];
    const seenHashes = new Set();
    for (const repo of this.presetsSources){
        for (const preset of repo.index.presets) {
            if (this.isPresetFitSearch(preset, searchParams) && !seenHashes.has(preset.hash)) {
                result.push([preset, repo]);
                seenHashes.add(preset.hash);
            }
        }
    }

    result.sort((a, b) => this.presetSearchPriorityComparer(a[0], b[0]));

    return result;
};

tab.presetSearchPriorityComparer = function(presetA, presetB) {
    if (presetA.lastPickDate && presetB.lastPickDate) {
        return presetB.lastPickDate - presetA.lastPickDate;
    }

    if (presetA.lastPickDate || presetB.lastPickDate) {
        return (presetA.lastPickDate) ? -1 : 1;
    }

    return (presetA.priority > presetB.priority) ? -1 : 1;
};

tab.isPresetFitSearchStatuses = function(preset, searchParams) {
    return 0 === searchParams.status.length || searchParams.status.includes(preset.status);
};

tab.isPresetFitSearchCategories = function(preset, searchParams) {
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

tab.isPresetFitSearchKeywords = function(preset, searchParams) {
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

tab.isPresetFitSearchAuthors = function(preset, searchParams) {
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

tab.isPresetFitSearchFirmwareVersions = function(preset, searchParams) {
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


tab.isPresetFitSearchString = function(preset, searchParams) {
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


tab.isPresetFitSearch = function(preset, searchParams) {
    if (preset.hidden) {
        return false;
    }

    if (!this.isPresetFitSearchStatuses(preset, searchParams)) {
        return false;
    }

    if (!this.isPresetFitSearchCategories(preset, searchParams)) {
        return false;
    }

    if (!this.isPresetFitSearchKeywords(preset, searchParams)) {
        return false;
    }

    if (!this.isPresetFitSearchAuthors(preset, searchParams)) {
        return false;
    }

    if (!this.isPresetFitSearchFirmwareVersions(preset, searchParams)) {
        return false;
    }

    if (!this.isPresetFitSearchString(preset, searchParams)) {
        return false;
    }

    return true;
};

tab.adaptPhones = function() {
    if ($(window).width() < 575) {
        const backdropHeight = $('.note').height() + 22 + 38;
        $('.backdrop').css('height', `calc(100% - ${backdropHeight}px)`);
    }

    if (GUI.isCordova()) {
        UI_PHONES.initToolbar();
    }
};

tab.read = function(readInfo) {
    this.cliEngine.readSerial(readInfo);
};

tab.cleanup = function(callback) {
    this.resetInitialValues();

    if (!(CONFIGURATOR.connectionValid && CONFIGURATOR.cliEngineActive && CONFIGURATOR.cliEngineValid)) {
        if (callback) {
            callback();
        }

        return;
    }

    TABS.presets.cliEngine.close(() => {
        if (callback) {
            callback();
        }
    });
};

tab.resetInitialValues = function() {
    CONFIGURATOR.cliEngineActive = false;
    CONFIGURATOR.cliEngineValid = false;
    CONFIGURATOR.cliTab = '';
    TABS.presets.presetsRepo = [];
    TABS.presets.pickedPresetList.length = 0;
    //this.domProgressDialog.close();
};

TABS[tab.tabName] = tab;

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        if (newModule && GUI.active_tab === tab.tabName) {
          TABS[tab.tabName].initialize();
        }
    });

    import.meta.hot.dispose(() => {
        tab.cleanup();
    });
}
