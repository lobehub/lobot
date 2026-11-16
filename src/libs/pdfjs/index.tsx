'use client';

// Use Vite's ?url import to get the correct hashed asset path (e.g. /_spa/assets/pdf.worker-xxx.mjs)
// This overrides react-pdf's auto-detected bare filename which breaks under SPA routing.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { type ComponentProps } from 'react';
import { Document as PdfDocument, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

type DocumentProps = ComponentProps<typeof PdfDocument>;

export const Document = (props: DocumentProps) => {
  return <PdfDocument {...props} />;
};

export { Page, pdfjs } from 'react-pdf';
