import React, { useEffect ,useState} from 'react';
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
  selectedFailedFile,
  setFailedDatasOfCurrentReport
}) => {
  const [initialConfigFormatted, setInitialConfigFormatted] = useState({lines:[]});

  const handleSave = (data) => {

    // onSave(data);
    onClose();
  };

  const addColsToStatementData = (pdfPath,columns) => {
    if(!selectedFailedFile) return;
    if(selectedFailedFile.path !== pdfPath) return;
    selectedFailedFile.rectifiedColumns = columns;
    selectedFailedFile.resolved = true;
    setFailedDatasOfCurrentReport((prev)=>prev.map((item)=>item.path === selectedFailedFile.path ? selectedFailedFile : item))
    onClose();
  }



  useEffect(() => {
    if(selectedFailedFile?.columns){
      
      let tempinitialConfigFormatted = {};
      tempinitialConfigFormatted.lines = selectedFailedFile?.columns.map((line) => ({ x: line }))
      setInitialConfigFormatted(tempinitialConfigFormatted);
    }
    console.log("PDFMarkerModal ", selectedFailedFile, "initialConfig ",initialConfigFormatted)
  }, [selectedFailedFile])




  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent   className="max-w-7xl h-[95vh] flex flex-col p-6 overflow-y-auto">
      {selectedFailedFile ? (
        <PdfMarker addColsToStatementData={addColsToStatementData} initialConfig={initialConfigFormatted} pdfPath={selectedFailedFile?.path} />
      ) : (
        <div className="text-center text-red-500">Error: PDF path not available</div>
      )}
      </DialogContent>
    </Dialog>
  );
};



export default PDFMarkerModal;