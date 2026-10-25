import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  ListItem,
  OrderedList,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { importProductsAPI, uploadPhotoAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const ACTION_COLORS = { create: 'green', update: 'blue', error: 'red' };
const ACTION_LABELS = { create: 'New', update: 'Update', error: 'Fix' };

// Bulk upload: check a spreadsheet (and the photos it names), then import it.
const AdminImport = () => {
  const toast = useToast();
  const [csvFile, setCsvFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(null); // null | 'checking' | 'uploading' | 'importing'
  const [uploaded, setUploaded] = useState(0);
  const [done, setDone] = useState(false);

  const reset = () => {
    setResult(null);
    setDone(false);
  };

  const readCsv = async () => {
    if (csvFile.size > MAX_CSV_BYTES) throw new Error('The spreadsheet is larger than 2 MB. Split it into smaller files.');
    return csvFile.text();
  };

  const check = async () => {
    setBusy('checking');
    reset();
    try {
      const names = Object.fromEntries(photos.map((f) => [f.name, null]));
      setResult(await importProductsAPI({ csv: await readCsv(), dryRun: true, photos: names }));
    } catch (err) {
      toast({
        title: 'Could not check the spreadsheet',
        description: getErrorMessage(err, err.message),
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    try {
      const csv = await readCsv();
      setBusy('uploading');
      setUploaded(0);
      const urls = {};
      for (const file of photos) {
        urls[file.name] = (await uploadPhotoAPI(file)).url;
        setUploaded((n) => n + 1);
      }
      setBusy('importing');
      const res = await importProductsAPI({ csv, dryRun: false, photos: urls });
      setResult(res);
      setDone(res.ok);
      toast({
        title: res.ok ? 'Products imported' : 'Nothing was imported',
        description: res.message,
        status: res.ok ? 'success' : 'error',
        duration: 6000,
        isClosable: true,
      });
    } catch (err) {
      toast({ title: 'Import failed', description: getErrorMessage(err, err.message), status: 'error', duration: 6000, isClosable: true });
    } finally {
      setBusy(null);
    }
  };

  const problems = result?.rows.filter((r) => r.errors.length || r.warnings.length) || [];

  return (
    <Box maxW='1000px'>
      <Heading as='h2' size='md' mb={2}>
        Bulk upload products
      </Heading>
      <OrderedList spacing={1} mb={6} color='gray.700' fontSize='sm'>
        <ListItem>
          <Link href='/templates/product-upload-template.csv' download textDecoration='underline'>
            Download the template
          </Link>{' '}
          and open it in Excel, Numbers or Google Sheets.
        </ListItem>
        <ListItem>
          One row per product. <b>sku</b> is your own code for the item; uploading the same SKU again updates it (e.g. a sheet with only sku
          and stock restocks items). Separate sizes and photo file names with <b>|</b>, e.g. <code>S|M|L</code>.
        </ListItem>
        <ListItem>Save as CSV, then choose it below together with the photos named in the images column.</ListItem>
        <ListItem>Check the preview, then import. Nothing is saved until every row is valid.</ListItem>
      </OrderedList>

      <HStack align='start' spacing={6} flexWrap='wrap' mb={4}>
        <FormControl maxW='360px'>
          <FormLabel>Spreadsheet (.csv)</FormLabel>
          <Input
            type='file'
            accept='.csv,text/csv'
            p={1}
            onChange={(e) => {
              setCsvFile(e.target.files[0] || null);
              reset();
            }}
          />
        </FormControl>
        <FormControl maxW='360px'>
          <FormLabel>Photos</FormLabel>
          <Input
            type='file'
            accept='image/jpeg,image/png,image/webp'
            multiple
            p={1}
            onChange={(e) => {
              setPhotos([...e.target.files]);
              reset();
            }}
          />
          <FormHelperText>JPEG, PNG or WebP, up to 15 MB each. {photos.length ? `${photos.length} selected.` : ''}</FormHelperText>
        </FormControl>
      </HStack>

      <HStack spacing={3} mb={6}>
        <Button
          onClick={check}
          isDisabled={!csvFile || Boolean(busy)}
          isLoading={busy === 'checking'}
          variant='outline'
          colorScheme='brand'
        >
          Check spreadsheet
        </Button>
        <Button
          onClick={runImport}
          colorScheme='brand'
          isDisabled={!result?.ok || done || Boolean(busy)}
          isLoading={busy === 'uploading' || busy === 'importing'}
          loadingText={busy === 'uploading' ? `Uploading photos ${uploaded}/${photos.length}` : 'Importing'}
        >
          Import {result?.ok && !done ? result.summary.create + result.summary.update : ''} products
        </Button>
      </HStack>

      {busy === 'uploading' && photos.length > 0 && (
        <Progress value={(uploaded / photos.length) * 100} size='sm' mb={6} colorScheme='gray' />
      )}

      {result && (
        <Box>
          <Alert status={done ? 'success' : result.ok ? 'info' : 'warning'} mb={4} borderRadius='md'>
            <AlertIcon />
            {result.message}
            {done && (
              <Link as={RouterLink} to='/admin/products' ml={2} textDecoration='underline'>
                View products
              </Link>
            )}
          </Alert>
          <HStack spacing={8} mb={4}>
            <Stat>
              <StatLabel>New</StatLabel>
              <StatNumber>{result.summary.create}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Updates</StatLabel>
              <StatNumber>{result.summary.update}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>To fix</StatLabel>
              <StatNumber color={result.summary.errors ? 'red.600' : undefined}>{result.summary.errors}</StatNumber>
            </Stat>
          </HStack>
          {result.rows.length > 0 && (
            <TableContainer border='1px solid #eee' borderRadius='md'>
              <Table size='sm'>
                <Thead>
                  <Tr>
                    <Th>Row</Th>
                    <Th>SKU</Th>
                    <Th>Name</Th>
                    <Th>Action</Th>
                    <Th>Notes</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(problems.length ? problems : result.rows).map((r) => (
                    <Tr key={r.row}>
                      <Td>{r.row}</Td>
                      <Td>{r.sku}</Td>
                      <Td whiteSpace='normal'>{r.name}</Td>
                      <Td>
                        <Badge colorScheme={ACTION_COLORS[r.action]}>{ACTION_LABELS[r.action]}</Badge>
                      </Td>
                      <Td whiteSpace='normal' fontSize='xs'>
                        {r.errors.map((e) => (
                          <Text key={e} color='red.600'>
                            {e}
                          </Text>
                        ))}
                        {r.warnings.map((w) => (
                          <Text key={w} color='gray.600'>
                            {w}
                          </Text>
                        ))}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
          {problems.length > 0 && problems.length < result.rows.length && (
            <Text fontSize='sm' color='gray.600' mt={2}>
              Showing the {problems.length} row(s) with notes; the other {result.rows.length - problems.length} are fine.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AdminImport;
