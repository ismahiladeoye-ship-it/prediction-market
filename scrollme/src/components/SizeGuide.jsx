import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from '@chakra-ui/react';

// UK, EU, US and foot length (cm). Brands vary slightly, so these are a guide.
export const SHOE_SIZES = {
  men: [
    ['5', '38', '6', '23.8'],
    ['5.5', '38.5', '6.5', '24.1'],
    ['6', '39', '7', '24.4'],
    ['6.5', '40', '7.5', '24.8'],
    ['7', '41', '8', '25.4'],
    ['7.5', '41.5', '8.5', '25.7'],
    ['8', '42', '9', '26'],
    ['8.5', '42.5', '9.5', '26.7'],
    ['9', '43', '10', '27'],
    ['9.5', '44', '10.5', '27.3'],
    ['10', '44.5', '11', '27.9'],
    ['10.5', '45', '11.5', '28.3'],
    ['11', '46', '12', '28.6'],
    ['11.5', '46.5', '12.5', '29'],
    ['12', '47', '13', '29.4'],
    ['13', '48', '14', '30.2'],
    ['14', '49', '15', '31'],
  ],
  women: [
    ['3', '36', '5.5', '22'],
    ['3.5', '36.5', '6', '22.4'],
    ['4', '37', '6.5', '22.9'],
    ['4.5', '37.5', '7', '23.3'],
    ['5', '38', '7.5', '23.8'],
    ['5.5', '38.5', '8', '24.1'],
    ['6', '39', '8.5', '24.6'],
    ['6.5', '40', '9', '25'],
    ['7', '41', '9.5', '25.4'],
    ['7.5', '41.5', '10', '25.8'],
    ['8', '42', '10.5', '26.2'],
    ['9', '43', '11.5', '27.1'],
  ],
};

// A "Size guide" link that opens a UK/EU/US shoe size chart and how to measure.
const SizeGuide = ({ department }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const women = department === 'women';
  const rows = women ? SHOE_SIZES.women : SHOE_SIZES.men;
  return (
    <>
      <Button variant='link' size='sm' color='inherit' textDecoration='underline' fontWeight='500' onClick={onOpen}>
        Size guide
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} size='lg' scrollBehavior='inside'>
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader>{women ? "Women's" : "Men's"} shoe size guide</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize='sm' mb={3}>
              Our sizes are UK sizes. Brands vary slightly, so use this as a guide.
            </Text>
            <TableContainer mb={4}>
              <Table size='sm'>
                <Thead>
                  <Tr>
                    <Th>UK</Th>
                    <Th>EU</Th>
                    <Th>US</Th>
                    <Th isNumeric>Foot length (cm)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map(([uk, eu, us, cm]) => (
                    <Tr key={uk}>
                      <Td fontWeight='600'>{uk}</Td>
                      <Td>{eu}</Td>
                      <Td>{us}</Td>
                      <Td isNumeric>{cm}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            <Text fontWeight='600' mb={1}>
              How to measure your foot
            </Text>
            <Text fontSize='sm' mb={1}>
              Stand on a sheet of paper with your heel against a wall. Mark the tip of your longest toe, then measure from the wall to the
              mark in centimetres. Do both feet and use the longer one.
            </Text>
            <Text fontSize='sm'>Pick the size whose foot length matches or is just above yours. Between sizes? Go up half a size.</Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SizeGuide;
