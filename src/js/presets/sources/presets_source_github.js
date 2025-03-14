import PresetsSource from "@/js/presets/sources/presets_source.js";

export default class PresetsSourceGithub extends PresetsSource {
    constructor(urlRepo, branch, official, name) {
        let correctUrlRepo = urlRepo.trim();

        if (!correctUrlRepo.endsWith("/")) {
            correctUrlRepo += "/";
        }

        let correctBranch = branch.trim();

        if (correctBranch.startsWith("/")) {
            correctBranch = correctBranch.slice(1);
        }

        if (correctBranch.endsWith("/")) {
            correctBranch = correctBranch.slice(0, -1);
        }

        const urlRaw = `https://raw.githubusercontent.com${correctUrlRepo.slice("https://github.com".length)}${correctBranch}/`;
        const urlViewOnline = `${correctUrlRepo}blob/${correctBranch}/`;

        super(urlRaw, urlViewOnline, official, name);
    }
}
