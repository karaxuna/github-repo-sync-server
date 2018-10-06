var path = require('path');
var rimraf = require('rimraf');
var Git = require('nodegit');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var getUniqueID = require('./getUniqueID');
var mkdir = Promise.promisify(mkdirp);
var rmdir = Promise.promisify(rimraf);
var tmpProjectDir = path.resolve(__dirname, '../projects');

module.exports = function updateTargetRepo(
    sourceRepoUrl,
    targetRepoUrl,
    ref
) {
    var repoId = getUniqueID();
    var repoDir = path.resolve(tmpProjectDir, repoId);
    var repo;
    var targetRemote;

    function getCredentials(url, userName) {
        return Git.Cred.sshKeyFromAgent(userName);
    }

    function certificateCheck() {
        return 1;
    }

    return mkdir(tmpProjectDir).then(function () {
        return Git.Clone(sourceRepoUrl, repoDir, {
            fetchOpts: {
                callbacks: {
                    certificateCheck: certificateCheck,
                    credentials: getCredentials
                }
            }
        }).then(function (repository) {
            repo = repository;
        });
    }).then(function () {
        return Git.Remote.create(repo, 'target', targetRepoUrl).then(function (remote) {
            targetRemote = remote;
        });
    }).then(function () {
        return repo.checkoutRef(ref);
    }).then(function () {
        return targetRemote.push(
            [ref + ':' + ref],
            {
                callbacks: {
                    certificateCheck: certificateCheck,
                    credentials: getCredentials
                }
            }
        );
    }).finally(function () {
        return rmdir(repoDir).then(function () {
            console.log('Temporary project removed.');
        }).catch(function (err) {
            console.log('Cannot remove temporary project:', err);
        });
    });
}