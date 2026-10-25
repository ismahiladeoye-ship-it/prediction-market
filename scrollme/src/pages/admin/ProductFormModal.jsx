import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { createProductAPI, updateProductAPI, uploadPhotoAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';

const EMPTY = {
  sku: '',
  name: '',
  brand: '',
  category: '',
  price: '',
  stock: '',
  images: [],
  color: '',
  material: '',
  sizes: '',
  description: '',
  isActive: true,
};

const toForm = (p) =>
  p
    ? {
        sku: p.sku || '',
        name: p.name || '',
        brand: p.brand || '',
        category: p.category || '',
        price: p.price ?? '',
        stock: p.stock ?? '',
        images: p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [],
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
  if (f.sku && !/^[A-Za-z0-9._/-]{1,64}$/.test(f.sku.trim())) e.sku = 'Letters, numbers, dots, dashes, slashes and underscores only';
  return e;
};

const ProductFormModal = ({ isOpen, onClose, product, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(product));
      setErrors({});
    }
  }, [isOpen, product]);

  const setImages = (update) => setForm((f) => ({ ...f, images: update(f.images) }));

  const uploadPhotos = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    setUploading(true);
    try {
      for (const file of files) {
        const { url } = await uploadPhotoAPI(file);
        setImages((imgs) => [...imgs, url]);
      }
    } catch (err) {
      toast({ title: 'Photo upload failed', description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true });
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      toast({ title: 'Enter a link starting with http:// or https://', status: 'warning', duration: 4000 });
      return;
    }
    setImages((imgs) => [...imgs, url]);
    setLink('');
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {
      ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      category: form.category.trim().toLowerCase(),
      price: Number(form.price),
      stock: Number(form.stock),
      images: form.images,
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
            {field('sku', 'SKU', { placeholder: 'Your code, e.g. ESS-TRK-BLK-01' })}
            {field('brand', 'Brand')}
            {field('category', 'Category slug', { isRequired: true, placeholder: 'e.g. tshirts' })}
            {field('price', 'Price', { isRequired: true, type: 'number', min: 0, step: '0.01' })}
            {field('stock', 'Stock', { isRequired: true, type: 'number', min: 0, step: 1 })}
            {field('color', 'Colour')}
            {field('material', 'Material')}
            {field('sizes', 'Sizes (comma separated)', { placeholder: 'S, M, L' })}
          </SimpleGrid>
          <SimpleGrid columns={1} spacing={4} mt={4}>
            <FormControl>
              <FormLabel>Photos</FormLabel>
              {form.images.length > 0 && (
                <HStack spacing={3} mb={3} flexWrap='wrap' align='start'>
                  {form.images.map((url, i) => (
                    <Box key={url} w='92px' textAlign='center'>
                      <Image src={url} alt={`Photo ${i + 1}`} boxSize='92px' objectFit='cover' borderRadius='md' border='1px solid #eee' />
                      {i === 0 ? (
                        <Text fontSize='xs' fontWeight={700} mt={1}>
                          Main photo
                        </Text>
                      ) : (
                        <Button
                          size='xs'
                          variant='link'
                          mt={1}
                          onClick={() => setImages((imgs) => [url, ...imgs.filter((u) => u !== url)])}
                        >
                          Make main
                        </Button>
                      )}
                      <Button
                        size='xs'
                        variant='link'
                        colorScheme='red'
                        display='block'
                        mx='auto'
                        aria-label={`Remove photo ${i + 1}`}
                        onClick={() => setImages((imgs) => imgs.filter((u) => u !== url))}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                </HStack>
              )}
              <HStack spacing={3} flexWrap='wrap'>
                <Button
                  as='label'
                  size='sm'
                  variant='outline'
                  colorScheme='brand'
                  cursor='pointer'
                  isLoading={uploading}
                  loadingText='Uploading'
                >
                  Upload photos
                  <input
                    type='file'
                    accept='image/jpeg,image/png,image/webp'
                    multiple
                    hidden
                    onChange={uploadPhotos}
                    aria-label='Upload photos'
                  />
                </Button>
                <Input
                  size='sm'
                  maxW='280px'
                  placeholder='or paste a photo link (https://…)'
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                <Button size='sm' onClick={addLink} isDisabled={!link.trim()}>
                  Add link
                </Button>
              </HStack>
              <FormHelperText>JPEG, PNG or WebP up to 15 MB. Photos are resized and location data is removed.</FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea value={form.description} onChange={set('description')} rows={4} />
            </FormControl>
            <Checkbox colorScheme='brand' isChecked={form.isActive} onChange={set('isActive')}>
              Visible in the store
            </Checkbox>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme='brand' onClick={save} isLoading={saving} isDisabled={uploading}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProductFormModal;
