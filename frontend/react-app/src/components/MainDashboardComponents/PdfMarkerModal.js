import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import PdfMarker  from './PdfMarker';

const PDFMarkerModal = ({ 
  isOpen, 
  onClose,
  onSave,
  initialConfig,
  pdfName
}) => {
  const handleSave = (data) => {
    onSave(data);
    onClose();
  };


  useEffect(() => {
    console.log("PDFMarkerModal pdfName:", pdfName)
  }, [pdfName])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>PDF Column Marker</DialogTitle>
        </DialogHeader>
        <div>
      {pdfName ? (
        <PdfMarker setPdfColMarkerData={handleSave} initialConfig={initialConfig} pdfName={pdfName} />
      ) : (
        <div className="text-center text-red-500">Error: PDF path not available</div>
      )}
    </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFMarkerModal;