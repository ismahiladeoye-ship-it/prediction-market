import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { createProductAPI, updateProductAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';

const EMPTY = {
  name: '',
  brand: '',
  category: '',
  price: '',
  stock: '',
  imageUrl: '',
  color: '',
  material: '',
  sizes: '',
  description: '',
  isActive: true,
};

const toForm = (p) =>
  p
    ? {
        name: p.name || '',
        brand: p.brand || '',
        category: p.category || '',
        price: p.price ?? '',
        stock: p.stock ?? '',
        imageUrl: p.imageUrl || '',
        color: p.color || '',
        material: p.material || '',
        sizes: (p.sizes || []).join(', '),
        description: p.description || '',
        isActive: p.isActive !== false,
      }
    : EMPTY;

// Same rules as the API so problems show before saving.
const validate = (f) => {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Name is required';
  if (!/^[a-z0-9-]+$/.test(f.category.trim().toLowerCase())) e.category = 'Use a slug such as t-shirts';
  if (f.price === '' || Number(f.price) < 0 || Number.isNaN(Number(f.price))) e.price = 'Enter a price of 0 or more';
  if (f.stock === '' || !Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) e.stock = 'Enter a whole number of 0 or more';
  if (f.imageUrl && !/^https?:\/\//.test(f.imageUrl)) e.imageUrl = 'Must be an http(s) URL';
  return e;
};

const ProductFormModal = ({ isOpen, onClose, product, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(product));
      setErrors({});
    }
  }, [isOpen, product]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      category: form.category.trim().toLowerCase(),
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl.trim(),
      color: form.color.trim() || undefined,
      material: form.material.trim() || undefined,
      sizes: form.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      const saved = product ? await updateProductAPI(product._id, body) : await createProductAPI(body);
      toast({ title: product ? 'Product updated' : 'Product created', status: 'success', duration: 3000 });
      onSaved(saved);
      onClose();
    } catch (err) {
      toast({ title: 'Could not save product', description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, { isRequired, ...props } = {}) => (
    <FormControl isInvalid={Boolean(errors[key])} isRequired={isRequired}>
      <FormLabel>{label}</FormLabel>
      <Input value={form[key]} onChange={set(key)} {...props} />
      <FormErrorMessage>{errors[key]}</FormErrorMessage>
    </FormControl>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='2xl' scrollBehavior='inside'>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{product ? 'Edit product' : 'New product'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {field('name', 'Name', { isRequired: true })}
            {field('brand', 'Brand')}
            {field('category', 'Category slug', { isRequired: true, placeholder: 'e.g. tshirts' })}
            {field('price', 'Price', { isRequired: true, type: 'number', min: 0, step: '0.01' })}
            {field('stock', 'Stock', { isRequired: true, type: 'number', min: 0, step: 1 })}
            {field('color', 'Colour')}
            {field('material', 'Material')}
            {field('sizes', 'Sizes (comma separated)', { placeholder: 'S, M, L' })}
          </SimpleGrid>
          <SimpleGrid columns={1} spacing={4} mt={4}>
            {field('imageUrl', 'Image URL', { placeholder: 'https://…' })}
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea value={form.description} onChange={set('description')} rows={4} />
            </FormControl>
            <Checkbox colorScheme='teal' isChecked={form.isActive} onChange={set('isActive')}>
              Visible in the store
            </Checkbox>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme='teal' onClick={save} isLoading={saving}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProductFormModal;
