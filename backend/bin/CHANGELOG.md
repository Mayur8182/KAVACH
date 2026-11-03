### Added Features

- Add file catalogers to selection configuration [[#3505](https://github.com/anchore/syft/pull/3505) @wagoodman]
- Configuration for including license contents in SBOM [[#3626](https://github.com/anchore/syft/issues/3626) [#3631](https://github.com/anchore/syft/pull/3631) @spiffcs]
- Support Bitnami embedded SBOMs [[#3065](https://github.com/anchore/syft/issues/3065) [#3341](https://github.com/anchore/syft/pull/3341) @juan131]

### Bug Fixes

- Version parse caused by line breaks on different platforms [[#3672](https://github.com/anchore/syft/pull/3672) @idhyt]
- find bitnami files even when no relationships [[#3676](https://github.com/anchore/syft/pull/3676) @willmurphyscode]
- License files which do not match an SPDX expression are erroneously handled as 'unlicensed' [[#3412](https://github.com/anchore/syft/issues/3412) [#3366](https://github.com/anchore/syft/pull/3366) @HeyeOpenSource]
- Incorrect URL encoding of package url (purl) [[#3533](https://github.com/anchore/syft/issues/3533) [#3678](https://github.com/anchore/syft/pull/3678) @kzantow]
- syft should not warn on known bad package.json [[#3470](https://github.com/anchore/syft/issues/3470) [#3645](https://github.com/anchore/syft/pull/3645) @kzantow]
- Scanning a project with many DLLs is slow [[#3455](https://github.com/anchore/syft/issues/3455) [#3677](https://github.com/anchore/syft/pull/3677) @rogueai]
- cyclone-dx presenter drops files, includes only packages [[#3435](https://github.com/anchore/syft/issues/3435) [#3539](https://github.com/anchore/syft/pull/3539) @spiffcs]
- "syft config" output swaps comments for search-indexed-archives / search-unindexed-archives [[#3624](https://github.com/anchore/syft/issues/3624) [#3630](https://github.com/anchore/syft/pull/3630) @spiffcs]
- dpkg license improvement for non SPDX licenses [[#3090](https://github.com/anchore/syft/issues/3090) [#3366](https://github.com/anchore/syft/pull/3366) @HeyeOpenSource]
- RPM-based PURLs sometimes have incorrect namespace (specifically OpenSUSE) [[#3534](https://github.com/anchore/syft/issues/3534) [#3615](https://github.com/anchore/syft/pull/3615) @mprpic]

### Additional Changes

- update to go 1.24.x [[#3660](https://github.com/anchore/syft/pull/3660) @westonsteimel]
- replace all shorthand tags of mapstruct -> mapstructure [[#3633](https://github.com/anchore/syft/pull/3633) @spiffcs]

**[(Full Changelog)](https://github.com/anchore/syft/compare/v1.19.0...v1.20.0)**
