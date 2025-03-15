export default class PresetsSourceGithubUtil {
    static containsBranchName(url) {
        return url.includes("/tree/");
    }

    static isUrlGithubRepo(url) {
        return url.trim().toLowerCase().startsWith("https://github.com/");
    }

    static getBranchName(url) {
        const pattern = /https:\/\/github\.com\/[^/]+\/[^/]+\/tree\/([^/]+)/;
        const match = url.match(pattern);

        return match ? match[1] : null;
    }

    static getUrlsForGithub(url, branch) {
            let repoUrl = url.trim();
    
            if (!repoUrl.endsWith("/")) {
                repoUrl += "/";
            }
            
            let repoBranch = branch.trim();
    
            if (repoBranch.startsWith("/")) {
                repoBranch = repoBranch.slice(1);
            }
    
            if (repoBranch.endsWith("/")) {
                repoBranch = repoBranch.slice(0, -1);
            }

            return {rawUrl:  `https://raw.githubusercontent.com${repoUrl.slice("https://github.com".length)}${repoBranch}/`, viewUrl: `${repoUrl}blob/${repoBranch}/`};
    }
}