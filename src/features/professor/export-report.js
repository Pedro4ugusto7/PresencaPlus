import { Platform, Share } from 'react-native';
export async function exportReportCsv(filename, csv) {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({
    title: filename,
    message: csv
  });
}
