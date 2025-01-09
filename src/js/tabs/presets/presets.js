import CliEngine from '../../CliEngine';
import PickedPreset from './PickedPreset';
import PresetsDetailedDialog from './DetailedDialog/PresetsDetailedDialog';
import PresetsGithubRepo from './PresetsRepoIndexed/PresetsGithubRepo';
import PresetsWebsiteRepo from './PresetsRepoIndexed/PresetsWebsiteRepo';
import PresetTitlePanel from './TitlePanel/PresetTitlePanel';
import PresetsSourcesDialog from './SourcesDialog/SourcesDialog';
import PresetSource from './SourcesDialog/PresetSource';
import FavoritePresetsClass from './FavoritePresets';
import { diff } from 'semver';


const presets = {
    tabName: 'presets',
    presetsRepo: [],
    cliEngine: null,
    pickedPresetList: [],
    majorVersion: 1,
    favoritePresets: null,
};

presets.initialize = function (callback) {
    const self = this;

    self.cliEngine = new CliEngine(self);
    self.cliEngine.setProgressCallback(value => this.onApplyProgressChange(value));
    self._presetPanels = [];
    self.favoritePresets = new FavoritePresetsClass();
    self.favoritePresets.loadFromStorage();


    $('#content').load("/src/tabs/presets/presets.html", () => self.onHtmlLoad(callback));

    if (GUI.active_tab !== 'presets') {
        GUI.active_tab = 'presets';
    }
};

presets.readDom = function() {
    this._divGlobalLoading = $('#presets_global_loading');
    this._divGlobalLoadingError = $('#presets_global_loading_error');
    this._divCli = $('#presets_cli');
    this._divMainContent = $('#presets_main_content');
    this._selectCategory = $('#presets_filter_category');
    this._selectKeyword = $('#presets_filter_keyword');
    this._selectAuthor = $('#presets_filter_author');
    this._selectFirmwareVersion = $('#presets_filter_firmware_version');
    this._selectStatus = $('#presets_filter_status');
    this._inputTextFilter = $('#presets_filter_text');
    this._divPresetList = $('#presets_list');

    this._domButtonSave = $("#presets_save_button");
    this._domButtonCancel = $("#presets_cancel_button");

    this._domReloadButton = $("#presets_reload");
    this._domContentWrapper = $("#presets_content_wrapper");

    // CLI Dialog
    this._domDialogCli = $("#presets_cli_dialog");
    this._domButtonCliExit = $("#presets_cli_exit_button");
    this._domButtonCliSave = $("#presets_cli_save_button");
    this._domDialogCli = $("#presets_cli_dialog");
    this._domProgressDialogProgressBar = $(".presets_apply_progress_dialog_progress_bar");
    this._domDialogCliWarning = $(".presets_cli_errors_dialog_warning");

    this._domButtonBackupDiffAll = $(".backup_diff_all");
    this._domButtonBackupDumpAll = $(".backup_dump_all");
    this._domButtonBackupLoad = $(".backup_load");
    this._domButtonPresetSources = $(".presets_sources_show");

    this._domWarningNotOfficialSource = $(".presets_warning_not_official_source");
    this._domWarningFailedToLoadRepositories = $(".presets_failed_to_load_repositories");
    this._domWarningBackup = $(".presets_warning_backup");
    this._domButtonHideBackupWarning = $(".presets_warning_backup_button_hide");

    this._domListNoFound = $("#presets_list_no_found");
    this._domListTooManyFound = $("#presets_list_too_many_found");
};

presets.getPickedPresetsCli = function() {
    let result = [];
    this.pickedPresetList.forEach(pickedPreset => {
        result.push(...pickedPreset.presetCli);
    });
    result = result.filter(command => command.trim() !== "");
    return result;
};

presets.onApplyProgressChange = function(value) {
    this._domProgressDialogProgressBar.val(value);
};

presets.applyCommandsList = function(strings) {
    strings.forEach(cliCommand => {
        this.cliEngine.sendLine(cliCommand);
    });
};

presets.previewCommands = async function(result, fileName) {
            const previewArea = $("#snippetpreviewcontent textarea#preview");

            function executeSnippet(fileName) {
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
}

presets.onSaveClick = async function () {
    const self = this;
    const cliCommandsArray = self.getPickedPresetsCli();

    const previewArea = $("#snippetpreviewcontent textarea#preview");

    async function executeSnippet() {
        try {
            const { commands, initialCliErrorCount, cliDialog } = await self.activateCli().then(() => {
                return new Promise((resolve) => {
                    const initialCliErrorCount = self.cliEngine.errorsCount;
                    const cliDialog = self.setupCliDialogAndShow({
                        title: i18n.getMessage("presetsApplyingPresets"),
                        buttonCancelCallback: null,
                    });
                    self._domProgressDialogProgressBar.show();
                    self._domProgressDialogProgressBar.val(0);
                    const commands = previewArea.val();
                    self.snippetPreviewWindow.close();
                    resolve({commands, initialCliErrorCount, cliDialog});
                });
            });
    
            console.log("new promise with commands: " + commands);
    
            await self.cliEngine.executeCommands(commands).then(() => {
                return { initialCliErrorCount, cliDialog }; // Pass values forward
            }).then(({ initialCliErrorCount, cliDialog }) => {
                console.log("finished running commands, new error count " + self.cliEngine.errorsCount + " and old: " + initialCliErrorCount);
                self._domProgressDialogProgressBar.hide();
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
        self._domButtonCliSave.off("click");
        self._domButtonCliSave.on("click", () =>{
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
            self._domDialogCli[0].close();
        });
        self._domButtonCliSave.show();
        
        self._domButtonCliExit.off("click");
        self._domButtonCliExit.on("click", () =>{
            self._domDialogCli[0].close();
        });
        self._domButtonCliExit.show();

        self._domDialogCli.on("close", () => {
            self.cliEngine.sendLine(CliEngine.s_commandExit);
            self.disconnectCliMakeSure();
            self._domDialogCliWarning.hide();
            self._domButtonCliSave.hide();
            self._domButtonCliExit.hide();
            self._domDialogCli.off("close");
            self._domButtonCliSave.off("click");
            self._domButtonCliExit.off("click");
        });
    }

    self.markPickedPresetsAsFavorites();
    previewCommands(cliCommandsArray)
};

presets.disconnectCliMakeSure = function() {
    GUI.timeout_add('disconnect', function () {
        $('div.connect_controls a.connect').trigger( "click" );
    }, 500);
};

presets.markPickedPresetsAsFavorites = function() {
    for (const pickedPreset of this.pickedPresetList) {
        if (pickedPreset.presetRepo !== undefined){
            this.favoritePresets.add(pickedPreset.preset, pickedPreset.presetRepo);
        }
    }

    this.favoritePresets.saveToStorage();
};

presets.setupCliDialogAndShow = function(cliDialogSettings) {
    // cliDialogSettings:
    // title, showCancelButton, buttonCancelCallback
    const title = $("#presets_cli_dialog_title");

    title.html(cliDialogSettings.title);
    title.show();
    if (cliDialogSettings.showCancelButton) {
        this._domButtonCliCancel.toggle(!!cliDialogSettings.buttonCancelCallback);
        this._domButtonCliCancel.off("click");

        this._domButtonCliCancel.on("click", () => {
            this._domDialogWait[0].close();
            cliDialogSettings.buttonCancelCallback?.();
        });
    }

    this._domDialogCli[0].showModal();
    return this._domDialogCli[0];
}


presets.setupMenuButtons = function() {
    this._domButtonSave.on("click", () => this.onSaveClick());


    this._domButtonCancel.on("click", () => {
        for (const pickedPreset of this.pickedPresetList) {
            pickedPreset.preset.isPicked = false;
        }

        this.updateSearchResults();
        this.pickedPresetList.length = 0;
        this.enableSaveCancelButtons(false);
    });

    this._domButtonBackupDiffAll.on("click", () => this.onSaveBackupClick("diff"));
    this._domButtonBackupDumpAll.on("click", () => this.onSaveBackupClick("dump"));
    this._domButtonBackupLoad.on("click", () => this.onBackupLoadClick());

    this._domButtonPresetSources.on("click", () => this.onPresetSourcesShowClick());
    this._domButtonHideBackupWarning.on("click", () => this.onButtonHideBackupWarningClick());

    this._domButtonSave.toggleClass(GUI.buttonDisabledClass, false);
    this._domButtonCancel.toggleClass(GUI.buttonDisabledClass, false);
    this._domReloadButton.on("click", () => this.reload());

    this.enableSaveCancelButtons(false);

};

presets.enableSaveCancelButtons = function (isEnabled) {
    this._domButtonSave.toggleClass(GUI.buttonDisabledClass, !isEnabled);
    this._domButtonCancel.toggleClass(GUI.buttonDisabledClass, !isEnabled);
};

presets.onButtonHideBackupWarningClick = function() {
    this._domWarningBackup.toggle(false);
    ConfigStorage.set({'showPresetsWarningBackup': false});
};

presets.setupBackupWarning = function() {
    let showPresetsWarningBackup = false;
    ConfigStorage.get('showPresetsWarningBackup', function (result) {
        if (result.showPresetsWarningBackup) {
            showPresetsWarningBackup = true;
        } else if (showPresetsWarningBackup === undefined) {
            showPresetsWarningBackup = true;
        }
    });

    const warningVisible = !!showPresetsWarningBackup;
    this._domWarningBackup.toggle(warningVisible);
};

presets.onPresetSourcesShowClick = function() {
    this.presetsSourcesDialog.show().then(() => {
        this.reload();
    });
};

presets.onSaveBackupClick = async function(backupType) {
    let waitingDialogTitle = "";

    switch (backupType) {
        case "diff":
            waitingDialogTitle = i18n.getMessage("backupDiffAll")
        break;
        case "dump":
            waitingDialogTitle = i18n.getMessage("backupDumpAll")
        break;
    }

    const waitingDialog = presets.setupCliDialogAndShow(
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

presets.performBackup = function(backupType) {
    const self = this;
    let lastCliStringReceived = performance.now();

    const readingDumpIntervalName = "PRESETS_BACKUP_INTERVAL";
    this.cliEngine.subscribeResponseCallback(() => {
        lastCliStringReceived = performance.now();
    });

    switch (backupType) {
        case "diff":
            this.cliEngine.sendLine(CliEngine.s_commandDiffAll);
            break;
        case "dump":
            this.cliEngine.sendLine(CliEngine.s_commandDumpAll);
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

presets.onBackupLoadClick = async function() {
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

presets.onHtmlLoad = function(callback) {
    i18n.localizePage();
    TABS.presets.adaptPhones();
    this.readDom();
    this.setupMenuButtons();
    this.setupBackupWarning();
    this._inputTextFilter.attr("placeholder", "Example: \"OMPHOBBY M4 Max\", or \"OMPHOBBY M7\"");

    this.presetsDetailedDialog = new PresetsDetailedDialog($("#presets_detailed_dialog"), this.pickedPresetList, () => this.onPresetPickedCallback(), this.favoritePresets);
    this.presetsSourcesDialog = new PresetsSourcesDialog($("#presets_sources_dialog"));

    this.presetsDetailedDialog.load()
    .then(() => this.presetsSourcesDialog.load())
    .then(() => {
        this.tryLoadPresets();
        GUI.content_ready(callback);
    });
};

presets.onPresetPickedCallback = function() {
    this.enableSaveCancelButtons(true);
};


// activateCli returns a new Promise that resolves when the CLI engine is ready
presets.activateCli = function() {
    return new Promise((resolve, reject) => {
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

presets.reload = function() {
    this.resetInitialValues();
    this.tryLoadPresets();
};

presets.tryLoadPresets = function() {
    const presetSources = this.presetsSourcesDialog.getActivePresetSources();

    this.presetsRepo = presetSources.map(source => {
        if (PresetSource.isUrlGithubRepo(source.url)) {
            return new PresetsGithubRepo(source.url, source.gitHubBranch, source.official, source.name);
        } else {
            return new PresetsWebsiteRepo(source.url, source.official, source.name);
        }
    });

    this._divMainContent.toggle(false);
    this._divGlobalLoadingError.toggle(false);
    this._divGlobalLoading.toggle(true);
    this._domWarningNotOfficialSource.toggle(this.presetsSourcesDialog.isThirdPartyActive);

    const failedToLoad = [];

    Promise.all(this.presetsRepo.map(p => p.loadIndex().catch((reason => failedToLoad.push(p)))))
    .then(() => {
        this._domWarningFailedToLoadRepositories.toggle(failedToLoad.length > 0);
        this._domWarningFailedToLoadRepositories.html(i18n.getMessage("presetsFailedToLoadRepositories", {"repos": failedToLoad.map(repo => repo.name).join("; ")}));
        this.presetsRepo = this.presetsRepo.filter(repo => !failedToLoad.includes(repo));
        return this.checkPresetSourceVersion();
    })
    .then(() => {
        this.presetsRepo.forEach(p => this.favoritePresets.addLastPickDate(p.index.presets, p));
        this.prepareFilterFields();
        this._divGlobalLoading.toggle(false);
        this._divMainContent.toggle(true);
    }).catch(err => {
        this._divGlobalLoading.toggle(false);
        this._divGlobalLoadingError.toggle(true);
        console.error(err);
    });
};

presets.multipleSelectComponentScrollFix = function() {
    /*
        A hack for multiple select that fixes scrolling problem
        when the number of items 199+. More details here:
        https://github.com/wenzhixin/multiple-select/issues/552
    */
   return new Promise((resolve) => {
    GUI.timeout_add('hack_fix_multipleselect_scroll', () => {
        this._selectCategory.multipleSelect('refresh');
        this._selectKeyword.multipleSelect('refresh');
        this._selectAuthor.multipleSelect('refresh');
        this._selectFirmwareVersion.multipleSelect('refresh');
        this._selectStatus.multipleSelect('refresh');
        resolve();
    }, 100);
   });
};

presets.checkPresetSourceVersion = function() {
    const self = this;

    return new Promise((resolve, reject) => {
        const differentMajorVersionsRepos = self.presetsRepo.filter(pr => self.majorVersion !== pr.index.majorVersion);
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

presets.prepareFilterFields = function() {
    this._freezeSearch = true;

    this.prepareFilterSelectField(this._selectCategory, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.category), 3);
    this.prepareFilterSelectField(this._selectKeyword, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.keywords), 3);
    this.prepareFilterSelectField(this._selectAuthor, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.author), 1);
    this.prepareFilterSelectField(this._selectFirmwareVersion, getUniqueValues(this.presetsRepo, x => x.index.uniqueValues.firmware_version), 2);
    this.prepareFilterSelectField(this._selectStatus, getUniqueValues(this.presetsRepo, x => x.index.settings.PresetStatusEnum), 2);

    this.multipleSelectComponentScrollFix().then(() => {
        this.preselectFilterFields();
        this._inputTextFilter.on('input', () => this.updateSearchResults());
        this._freezeSearch = false;
        this.updateSearchResults();
    });
};

presets.preselectFilterFields = function() {
    const currentVersion = FC.CONFIG.flightControllerVersion;
    const selectedVersions = [];

    for (const repo of this.presetsRepo) {
        for (const bfVersion of repo.index.uniqueValues.firmware_version) {
            if (currentVersion.startsWith(bfVersion)) {
                selectedVersions.push(bfVersion);
            }
        }
    }

    this._selectFirmwareVersion.multipleSelect('setSelects', selectedVersions);
};

presets.prepareFilterSelectField = function(domSelectElement, selectOptions, minimumCountSelected) {
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

presets.updateSearchResults = function() {
    if (!this._freezeSearch)
    {
        const searchParams = {
            categories: this._selectCategory.multipleSelect("getSelects", "text"),
            keywords: this._selectKeyword.multipleSelect("getSelects", "text"),
            authors: this._selectAuthor.multipleSelect("getSelects", "text"),
            firmwareVersions: this._selectFirmwareVersion.multipleSelect("getSelects", "text"),
            status: this._selectStatus.multipleSelect("getSelects", "text"),
            searchString: this._inputTextFilter.val().trim(),
        };

        this.updateSelectStyle();
        searchParams.authors = searchParams.authors.map(str => str.toLowerCase());
        const fitPresets = this.getFitPresets(searchParams);
        this.displayPresets(fitPresets);
    }
};

presets.updateSelectStyle = function() {
    this.updateSingleSelectStyle(this._selectCategory);
    this.updateSingleSelectStyle(this._selectKeyword);
    this.updateSingleSelectStyle(this._selectAuthor);
    this.updateSingleSelectStyle(this._selectFirmwareVersion);
    this.updateSingleSelectStyle(this._selectStatus);
};

presets.updateSingleSelectStyle = function(select) {
    const selectedOptions = select.multipleSelect("getSelects", "text");
    const isSomethingSelected = (0 !== selectedOptions.length);
    select.parent().find($(".ms-choice")).toggleClass("presets_filter_select_nonempty", isSomethingSelected);
};

presets.displayPresets = function(fitPresets) {
    this._presetPanels.forEach(presetPanel => {
        presetPanel.remove();
    });
    this._presetPanels = [];

    const maxPresetsToShow = 60;
    this._domListTooManyFound.toggle(fitPresets.length > maxPresetsToShow);
    fitPresets.length = Math.min(fitPresets.length, maxPresetsToShow);

    this._domListNoFound.toggle(fitPresets.length === 0);

    fitPresets.forEach(preset => {
        const presetPanel = new PresetTitlePanel(this._divPresetList, preset[0], preset[1], true, this.presetsSourcesDialog.isThirdPartyActive, this.favoritePresets);
        presetPanel.load();
        this._presetPanels.push(presetPanel);
        presetPanel.subscribeClick(this.presetsDetailedDialog, preset[1]);
    });

    this._domListTooManyFound.appendTo(this._divPresetList);
};


presets.getFitPresets = function(searchParams) {
    const result = [];
    const seenHashes = new Set();
    for (const repo of this.presetsRepo){
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

presets.presetSearchPriorityComparer = function(presetA, presetB) {
    if (presetA.lastPickDate && presetB.lastPickDate) {
        return presetB.lastPickDate - presetA.lastPickDate;
    }

    if (presetA.lastPickDate || presetB.lastPickDate) {
        return (presetA.lastPickDate) ? -1 : 1;
    }

    return (presetA.priority > presetB.priority) ? -1 : 1;
};

presets.isPresetFitSearchStatuses = function(preset, searchParams) {
    return 0 === searchParams.status.length || searchParams.status.includes(preset.status);
};

presets.isPresetFitSearchCategories = function(preset, searchParams) {
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

presets.isPresetFitSearchKeywords = function(preset, searchParams) {
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

presets.isPresetFitSearchAuthors = function(preset, searchParams) {
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

presets.isPresetFitSearchFirmwareVersions = function(preset, searchParams) {
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


presets.isPresetFitSearchString = function(preset, searchParams) {
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


presets.isPresetFitSearch = function(preset, searchParams) {
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

presets.adaptPhones = function() {
    if ($(window).width() < 575) {
        const backdropHeight = $('.note').height() + 22 + 38;
        $('.backdrop').css('height', `calc(100% - ${backdropHeight}px)`);
    }

    if (GUI.isCordova()) {
        UI_PHONES.initToolbar();
    }
};

presets.read = function(readInfo) {
    this.cliEngine.readSerial(readInfo);
};

presets.cleanup = function(callback) {
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

presets.resetInitialValues = function() {
    CONFIGURATOR.cliEngineActive = false;
    CONFIGURATOR.cliEngineValid = false;
    CONFIGURATOR.cliTab = '';
    TABS.presets.presetsRepo = [];
    TABS.presets.pickedPresetList.length = 0;
    //this._domProgressDialog.close();
};

TABS[presets.tabName] = presets;

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        if (newModule && GUI.active_tab === presets.tabName) {
          TABS[presets.tabName].initialize();
        }
    });

    import.meta.hot.dispose(() => {
        presets.cleanup();
    });
}
