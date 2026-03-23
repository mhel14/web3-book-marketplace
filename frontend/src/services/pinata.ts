const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

async function getPinataErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.details || data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}

export async function uploadFileToIPFS(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await getPinataErrorMessage(res, `File upload failed: ${res.statusText}`));
  }
  const data = await res.json();

  return data.IpfsHash;
}

export async function uploadJSONToIPFS(json: object): Promise<string> {
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(json),
  });

  if (!res.ok) {
    throw new Error(await getPinataErrorMessage(res, `JSON upload failed: ${res.statusText}`));
  }
  const data = await res.json();

  return data.IpfsHash;
}
