import { computed, observable } from "mobx";
import * as path from "path";
import { CommentThread, Location, Uri } from "vscode";
import { GistComment } from "../../store";
import { RepoFileSystemProvider } from "../fileSystem";
import { isWiki } from "../wiki/utils";

type TreeItemType = "blob" | "tree";

export interface TreeItem {
  path: string;
  mode: string;
  type: TreeItemType;
  sha: string;
  size: number;
  url: string;
  displayName?: string;
  backLinks?: TreeItemBackLink[];
  contents?: string;
}

export interface Tree {
  sha: string;
  url: string;
  tree: TreeItem[];
}

export interface TreeItemBackLink {
  linePreview: string;
  location: Location;
}

export class RepositoryFile {
  path: string;
  size: number;
  sha: string;
  mode: string;
  contents: string | undefined;
  isDirectory: boolean;
  uri: Uri;

  @observable tree: Tree;

  constructor(
    public repo: Repository,
    public treeItem: TreeItem,
    tree: Tree,
    public parent?: RepositoryFile
  ) {
    this.tree = tree;

    this.isDirectory = treeItem.type === "tree";
    this.path = treeItem.path;

    this.size = treeItem.size;
    this.sha = treeItem.sha;
    this.mode = treeItem.mode;

    this.uri = RepoFileSystemProvider.getFileUri(repo.name, this.path);
  }

  @computed
  get name(): string {
    return this.treeItem.displayName || path.basename(this.path);
  }

  @computed
  get files(): RepositoryFile[] | undefined {
    if (this.isDirectory) {
      return this.tree.tree
        .filter((item) => {
          const pathPrefix = `${this.path}/`;
          return (
            item.path.startsWith(pathPrefix) &&
            item.path.replace(pathPrefix, "").indexOf("/") === -1
          );
        })
        .sort((a, b) => {
          return b.type.localeCompare(a.type);
        })
        .map((item) => new RepositoryFile(this.repo, item, this.tree, this));
    }
  }

  @computed
  get comments(): RepositoryComment[] {
    return this.repo.comments.filter((comment) => comment.path === this.path);
  }

  @computed
  get backLinks(): TreeItemBackLink[] | undefined {
    return this.treeItem.backLinks;
  }
}

type RepositoryComment = GistComment & { path: string };

export class Repository {
  static DEFAULT_BRANCH = "master";

  @observable isLoading: boolean = true;
  @observable tree: Tree | undefined;
  latestCommit: string = "";
  comments: RepositoryComment[] = [];
  threads: CommentThread[] = [];
  etag: string | undefined;

  name: string;
  branch: string;

  constructor(public fullName: string) {
    if (this.fullName.includes("#")) {
      const parts = this.fullName.split("#");
      this.name = parts[0];
      this.branch = parts[1];
    } else {
      this.name = fullName;
      this.branch = Repository.DEFAULT_BRANCH;
    }
  }

  @computed
  get files(): RepositoryFile[] | undefined {
    return this.tree?.tree
      .filter((item) => !item.path.includes("/"))
      .sort((a, b) => {
        return b.type.localeCompare(a.type);
      })
      .map((item) => new RepositoryFile(this, item, this.tree!));
  }

  @computed
  get hasReadme(): boolean {
    return !!this.tree?.tree.find((item) => item.path === "README.md");
  }

  @computed
  get hasTours(): boolean {
    return this.tours.length > 0;
  }

  @computed
  get documents(): TreeItem[] {
    return this.tree?.tree.filter((item) => item.path.endsWith(".md")) || [];
  }

  @computed
  get isWiki(): boolean {
    return isWiki(this);
  }

  @computed
  get tours(): string[] {
    return (
      this.tree?.tree
        .filter((item) => item.path.startsWith(".tours/"))
        .map((item) => item.path) || []
    );
  }
}

export const store = observable({
  repos: [] as Repository[],
  isInCodeTour: false
});
