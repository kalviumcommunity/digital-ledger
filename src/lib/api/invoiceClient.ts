/**
 * Client service layer to generate and download transaction invoices from /api/transactions/:id/invoice.
 */
export async function downloadTransactionInvoice(
  transactionId: string,
  customerName?: string
): Promise<{ success: boolean; filename: string }> {
  const res = await fetch(`/api/transactions/${transactionId}/invoice`);

  if (!res.ok) {
    let errorMsg = `Failed to generate invoice (HTTP ${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson?.error?.message) {
        errorMsg = errorJson.error.message;
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  const safeCustomer = customerName ? `${customerName.replace(/[^a-zA-Z0-9_-]/g, '_')}-` : '';
  const filename = `invoice-${safeCustomer}${transactionId}.pdf`;

  // Create temporary URL and trigger browser file download
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up blob URL after small delay
  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);

  return { success: true, filename };
}
