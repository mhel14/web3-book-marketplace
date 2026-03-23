import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import PageHeader from '../components/ui/PageHeader';
import StatusBanner from '../components/ui/StatusBanner';
import { useToast } from '../components/ui/ToastProvider';
import { useWallet } from '../context/WalletContext';
import { uploadFileToIPFS, uploadJSONToIPFS } from '../services/pinata';
import { NFT_CONTRACT_ADDRESS } from '../utils/env';
import contractData from '../utils/BookStoreNFT.json';

interface FormDataState {
  title: string;
  author: string;
  address: string;
  isbn: string;
  genre: string;
  price: string;
}

interface UploadResults {
  metaUrl: string;
  coverUrl: string;
  bookUrl: string;
}

interface UploadStatus {
  message: string;
  tone: 'success' | 'error' | 'loading';
  title: string;
}

const PINATA_GATEWAY_DOMAIN = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN || 'gateway.pinata.cloud';
const initialFormState: FormDataState = {
  title: '',
  author: '',
  address: '',
  isbn: '',
  genre: '',
  price: '',
};

export default function Upload() {
  const { mintBookNFT, selectedAccount } = useWallet();
  const { pushToast } = useToast();
  const [formData, setFormData] = useState<FormDataState>(initialFormState);
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResults | null>(null);
  const [files, setFiles] = useState<{ cover: File | null; pdf: File | null }>({
    cover: null,
    pdf: null,
  });

  useEffect(() => {
    setFormData((current) => ({ ...current, address: selectedAccount }));
  }, [selectedAccount]);

  const coverPreview = useMemo(
    () => (files.cover ? URL.createObjectURL(files.cover) : ''),
    [files.cover],
  );
  const pdfPreview = useMemo(() => (files.pdf ? URL.createObjectURL(files.pdf) : ''), [files.pdf]);

  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
      if (pdfPreview) {
        URL.revokeObjectURL(pdfPreview);
      }
    };
  }, [coverPreview, pdfPreview]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value, address: selectedAccount }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, files: selectedFiles } = event.target;
    if (selectedFiles?.[0]) {
      setFiles((current) => ({ ...current, [name]: selectedFiles[0] }));
    }
  };

  const resetForm = () => {
    setFormData({ ...initialFormState, address: selectedAccount });
    setFiles({ cover: null, pdf: null });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!files.cover) {
      setStatus({
        title: 'Cover required',
        message: 'Choose a cover image before uploading.',
        tone: 'error',
      });
      return;
    }

    if (!files.pdf) {
      setStatus({
        title: 'Book file required',
        message: 'Choose a PDF so the reader file can be pinned to IPFS.',
        tone: 'error',
      });
      return;
    }

    setStatus(null);
    setResults(null);
    setIsUploading(true);

    try {
      const gatewayUrl = `https://${PINATA_GATEWAY_DOMAIN}/ipfs/`;
      setStatus({
        title: 'Uploading assets',
        message: 'Sending your cover image to IPFS.',
        tone: 'loading',
      });

      const coverCID = await uploadFileToIPFS(files.cover);

      setStatus({
        title: 'Uploading assets',
        message: 'Sending your PDF book to IPFS.',
        tone: 'loading',
      });
      const bookCID = await uploadFileToIPFS(files.pdf);

      setStatus({
        title: 'Preparing metadata',
        message: 'Building the metadata payload for minting.',
        tone: 'loading',
      });
      const metadata = {
        ...formData,
        timestamp: new Date().toISOString(),
        documents: {
          cover: {
            filename: files.cover.name,
            cid: coverCID,
            url: `${gatewayUrl}${coverCID}`,
          },
          book: {
            filename: files.pdf.name,
            cid: bookCID,
            url: `${gatewayUrl}${bookCID}`,
          },
        },
      };

      const metaCID = await uploadJSONToIPFS(metadata);

      setStatus({
        title: 'Minting NFT',
        message: 'Confirm the mint transaction in your wallet to finish publishing.',
        tone: 'loading',
      });
      await mintBookNFT(NFT_CONTRACT_ADDRESS, contractData.abi, metaCID);

      setResults({
        metaUrl: `${gatewayUrl}${metaCID}`,
        coverUrl: `${gatewayUrl}${coverCID}`,
        bookUrl: `${gatewayUrl}${bookCID}`,
      });
      setStatus({
        title: 'Upload complete',
        message: 'Your files were pinned and the NFT mint transaction succeeded.',
        tone: 'success',
      });
      pushToast({
        title: 'Book published',
        message: 'The book was uploaded, minted, and is now part of your collection.',
        tone: 'success',
      });
      resetForm();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'The upload flow failed.';
      setStatus({
        title: 'Upload failed',
        message,
        tone: 'error',
      });
      pushToast({
        title: 'Upload failed',
        message,
        tone: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <PageHeader eyebrow='Mint a New Token' title='Upload and Mint' description=' ' />

      {!selectedAccount ? (
        <StatusBanner
          tone='warning'
          title='Wallet required'
          message='Connect a wallet before uploading so the minted NFT can be assigned to an active account.'
        />
      ) : null}

      <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
        <form onSubmit={handleSubmit} className='page-card-strong space-y-6 p-6'>
          <div className='grid gap-5 md:grid-cols-2'>
            <div className='space-y-4'>
              <div className='space-y-2 text-left'>
                <label htmlFor='title' className='text-sm font-medium text-zinc-300'>
                  Book Title
                </label>
                <input
                  id='title'
                  className='input-shell'
                  type='text'
                  name='title'
                  value={formData.title}
                  placeholder='The Great Gatsby'
                  onChange={handleChange}
                  required
                  disabled={!selectedAccount || isUploading}
                />
              </div>

              <div className='space-y-2 text-left'>
                <label htmlFor='author' className='text-sm font-medium text-zinc-300'>
                  Author
                </label>
                <input
                  id='author'
                  className='input-shell'
                  type='text'
                  name='author'
                  value={formData.author}
                  placeholder='Author Name'
                  onChange={handleChange}
                  required
                  disabled={!selectedAccount || isUploading}
                />
              </div>

              <div className='space-y-2 text-left'>
                <label htmlFor='address' className='text-sm font-medium text-zinc-300'>
                  Wallet Address
                </label>
                <input
                  id='address'
                  className='input-shell font-mono text-sm'
                  type='text'
                  name='address'
                  value={selectedAccount}
                  placeholder='Connect a wallet to populate this field'
                  readOnly
                  disabled
                />
              </div>

              <div className='space-y-2 text-left'>
                <label htmlFor='isbn' className='text-sm font-medium text-zinc-300'>
                  ISBN
                </label>
                <input
                  id='isbn'
                  className='input-shell'
                  type='text'
                  name='isbn'
                  value={formData.isbn}
                  placeholder='978-3-16-148410-0'
                  onChange={handleChange}
                  disabled={!selectedAccount || isUploading}
                />
              </div>
            </div>

            <div className='space-y-4'>
              <div className='space-y-2 text-left'>
                <label htmlFor='genre' className='text-sm font-medium text-zinc-300'>
                  Genre
                </label>
                <input
                  id='genre'
                  className='input-shell'
                  type='text'
                  name='genre'
                  value={formData.genre}
                  placeholder='Fiction, Sci-Fi, Non-fiction'
                  onChange={handleChange}
                  required
                  disabled={!selectedAccount || isUploading}
                />
              </div>

              <div className='space-y-2 text-left'>
                <label htmlFor='price' className='text-sm font-medium text-zinc-300'>
                  Price (ETH)
                </label>
                <input
                  id='price'
                  className='input-shell'
                  type='text'
                  name='price'
                  value={formData.price}
                  placeholder='0.05'
                  onChange={handleChange}
                  required
                  disabled={!selectedAccount || isUploading}
                />
              </div>

              <div className='space-y-2 text-left'>
                <label htmlFor='cover-upload' className='text-sm font-medium text-zinc-300'>
                  Cover Image
                </label>
                <input
                  id='cover-upload'
                  type='file'
                  name='cover'
                  accept='image/*'
                  onChange={handleFileChange}
                  disabled={!selectedAccount || isUploading}
                  className='input-shell cursor-pointer border-dashed file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-white/15'
                />
              </div>

              <div className='space-y-2 text-left'>
                <label htmlFor='pdf-upload' className='text-sm font-medium text-zinc-300'>
                  PDF Book
                </label>
                <input
                  id='pdf-upload'
                  type='file'
                  name='pdf'
                  accept='.pdf'
                  onChange={handleFileChange}
                  disabled={!selectedAccount || isUploading}
                  className='input-shell cursor-pointer border-dashed file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-white/15'
                />
              </div>
            </div>
          </div>

          {status ? (
            <StatusBanner tone={status.tone} title={status.title} message={status.message} />
          ) : null}

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-zinc-400'>Upload book details first, then mint NFT.</p>
            <button
              disabled={!selectedAccount || isUploading}
              type='submit'
              className='inline-flex items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/12 px-5 py-3 text-sm font-semibold text-white transition hover:border-violet-300/30 hover:bg-violet-400/18 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isUploading ? 'Publishing book...' : 'Upload Book'}
            </button>
          </div>
        </form>

        <aside className='page-card space-y-5 p-6 text-left'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500'>
              Live Preview
            </p>
            <h2 className='text-2xl font-semibold tracking-tight text-white'>Book details</h2>
          </div>

          <div className='grid gap-4'>
            <div className='rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4'>
              <p className='mb-3 text-sm font-medium text-zinc-300'>Cover preview</p>
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt='Selected cover preview'
                  className='aspect-[3/4] w-full rounded-2xl object-cover'
                />
              ) : (
                <div className='flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950/70 text-sm text-zinc-500'>
                  No cover selected yet
                </div>
              )}
            </div>

            <div className='rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4'>
              <p className='mb-2 text-sm font-medium text-zinc-300'>Selected files</p>
              <div className='space-y-2 text-sm text-zinc-400'>
                <p>Cover: {files.cover?.name || 'Waiting for image selection'}</p>
                <p>PDF: {files.pdf?.name || 'Waiting for PDF selection'}</p>
              </div>
            </div>

            {results ? (
              <div className='rounded-[1.35rem] border border-emerald-400/20 bg-emerald-500/10 p-4'>
                <p className='text-sm font-semibold text-white'>Published asset links</p>
                <div className='mt-3 space-y-3 text-sm text-emerald-100'>
                  <a
                    href={results.metaUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block break-all hover:underline'
                  >
                    Metadata: {results.metaUrl}
                  </a>
                  <a
                    href={results.coverUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block break-all hover:underline'
                  >
                    Cover: {results.coverUrl}
                  </a>
                  <a
                    href={results.bookUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block break-all hover:underline'
                  >
                    Book PDF: {results.bookUrl}
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
