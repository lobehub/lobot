export interface WorkspaceHtmlArtifactFile {
  content: string;
  contentType: string;
  encoding: 'base64' | 'utf8';
  path: string;
}
