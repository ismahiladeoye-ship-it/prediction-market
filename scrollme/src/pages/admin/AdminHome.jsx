import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  AspectRatio,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  Link,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  useToast,
} from '@chakra-ui/react';
import { getHomeContentAPI } from '../../services/site/siteService';
import { resetHomeContentAPI, saveHomeContentAPI, uploadPhotoAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';
import { categoryLink, departmentLink, departments } from '../../utils/taxonomy';
import { FOCUS_POSITIONS, starterHero } from '../../utils/heroSlides';

const MAX_SLIDES = 6;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const OTHER = 'other';
const LINKS = [
  ...departments.flatMap((d) => [
    { value: departmentLink(d.slug), label: d.title },
    ...d.categories.map((c) => ({ value: categoryLink(d.slug, c.slug), label: `${d.title} · ${c.title}` })),
  ]),
  { value: '/products', label: 'All products' },
  { value: '/contact-us', label: 'Contact us (sourcing requests)' },
];

// _key identifies a slide in the editor while it is moved around (not saved).
let lastKey = 0;
const blankSlide = () => {
  lastKey += 1;
  return { _key: lastKey, image: '', title: '', subtitle: '', cta: 'Shop', link: '/products', focus: 'center' };
};

// The starter slides use CSS positions; the editor offers top / middle / bottom.
const focusOf = (position = '') => {
  const match = /(\d+)%/.exec(position);
  if (!match) return 'center';
  const percent = Number(match[1]);
  if (percent < 35) return 'top';
  return percent > 65 ? 'bottom' : 'center';
};

const fromContent = (content) => {
  if (content?.heroSlides?.length) {
    return { slides: content.heroSlides.map((s) => ({ ...blankSlide(), ...s })), mono: content.heroMono ?? true, custom: true };
  }
  const starter = starterHero();
  return {
    slides: starter.slides.map(({ position, ...s }) => ({ ...blankSlide(), ...s, focus: focusOf(position) })),
    mono: starter.mono,
    custom: false,
  };
};

const problemsOf = (slide) => {
  const problems = [];
  if (!slide.image) problems.push('add a photo');
  if (!slide.title.trim()) problems.push('add a heading');
  if (!slide.cta.trim()) problems.push('add the button text');
  if (!/^\/(?![/\\])\S*$/.test(slide.link.trim())) problems.push('choose where the button goes (a page starting with /)');
  return problems;
};

const SlideEditor = ({ slide, index, count, mono, onChange, onMove, onRemove }) => {
  const toast = useToast();
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [otherLink, setOtherLink] = useState(!LINKS.some((l) => l.value === slide.link));
  const number = index + 1;

  const upload = async (file) => {
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast({ title: 'That photo is larger than 15 MB', status: 'error', duration: 5000 });
      return;
    }
    setUploading(true);
    try {
      onChange({ image: (await uploadPhotoAPI(file)).url });
    } catch (err) {
      toast({ title: 'Upload failed', description: getErrorMessage(err), status: 'error', duration: 6000, isClosable: true });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <Box role='group' aria-label={`Cover image ${number}`} bg='white' borderRadius='lg' boxShadow='0 2px 10px rgba(0,0,0,0.08)' p={4}>
      <Flex justify='space-between' align='center' mb={3} gap={2} wrap='wrap'>
        <Heading as='h3' size='sm'>
          Cover image {number}
        </Heading>
        <HStack spacing={2}>
          <Button
            size='xs'
            variant='outline'
            onClick={() => onMove(-1)}
            isDisabled={index === 0}
            aria-label={`Move cover image ${number} up`}
          >
            ↑ Up
          </Button>
          <Button
            size='xs'
            variant='outline'
            onClick={() => onMove(1)}
            isDisabled={index === count - 1}
            aria-label={`Move cover image ${number} down`}
          >
            ↓ Down
          </Button>
          <Button size='xs' variant='outline' colorScheme='red' onClick={onRemove} isDisabled={count === 1}>
            Remove
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
        <Box>
          <AspectRatio ratio={16 / 9} borderRadius='md' overflow='hidden' bg='#1a1a1a'>
            {slide.image ? (
              <Box position='relative'>
                <Image
                  src={slide.image}
                  alt={`Cover image ${number} preview`}
                  objectFit='cover'
                  objectPosition={FOCUS_POSITIONS[slide.focus]}
                  w='100%'
                  h='100%'
                  filter={mono ? 'grayscale(1) contrast(1.08)' : undefined}
                />
                <Box position='absolute' inset={0} bg='linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.55))' />
                <Text
                  position='absolute'
                  left={4}
                  right={4}
                  top='38%'
                  color='white'
                  fontFamily='var(--font-display)'
                  fontSize='2xl'
                  textTransform='uppercase'
                  lineHeight={1}
                >
                  {slide.title}
                </Text>
              </Box>
            ) : (
              <Text color='gray.300' fontSize='sm'>
                No photo yet
              </Text>
            )}
          </AspectRatio>
          <HStack mt={3} spacing={3} flexWrap='wrap'>
            <input
              ref={fileInput}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              hidden
              aria-label={`Photo for cover image ${number}`}
              onChange={(e) => upload(e.target.files[0])}
            />
            <Button size='sm' colorScheme='brand' onClick={() => fileInput.current?.click()} isLoading={uploading} loadingText='Uploading'>
              {slide.image ? 'Change photo' : 'Upload photo'}
            </Button>
            <FormControl w='auto' display='flex' alignItems='center' gap={2}>
              <FormLabel mb={0} fontSize='sm'>
                Keep in view
              </FormLabel>
              <Select size='sm' w='auto' value={slide.focus} onChange={(e) => onChange({ focus: e.target.value })}>
                <option value='top'>Top</option>
                <option value='center'>Middle</option>
                <option value='bottom'>Bottom</option>
              </Select>
            </FormControl>
          </HStack>
          <Text fontSize='xs' color='gray.500' mt={2}>
            JPEG, PNG or WebP. Landscape photos at least 1600 px wide look best; phones show the middle of the photo.
          </Text>
        </Box>

        <Box>
          <FormControl mb={3} isRequired>
            <FormLabel>Heading</FormLabel>
            <Input
              value={slide.title}
              maxLength={60}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder='Our shoe restock is here'
            />
          </FormControl>
          <FormControl mb={3}>
            <FormLabel>Text under the heading</FormLabel>
            <Input
              value={slide.subtitle}
              maxLength={120}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder='New pairs this week'
            />
          </FormControl>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
            <FormControl isRequired>
              <FormLabel>Button text</FormLabel>
              <Input value={slide.cta} maxLength={24} onChange={(e) => onChange({ cta: e.target.value })} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Button goes to</FormLabel>
              <Select
                value={otherLink ? OTHER : slide.link}
                onChange={(e) => {
                  const other = e.target.value === OTHER;
                  setOtherLink(other);
                  if (!other) onChange({ link: e.target.value });
                }}
              >
                {LINKS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
                <option value={OTHER}>Another page…</option>
              </Select>
            </FormControl>
          </SimpleGrid>
          {otherLink && (
            <FormControl mt={3}>
              <FormLabel>Page address</FormLabel>
              <Input
                value={slide.link}
                maxLength={200}
                onChange={(e) => onChange({ link: e.target.value.replace(/ /g, '+') })}
                placeholder='/products?q=tracksuit'
              />
              <FormHelperText>A page on this shop, starting with /. Copy it from the address bar after the domain.</FormHelperText>
            </FormControl>
          )}
        </Box>
      </SimpleGrid>
    </Box>
  );
};

// Admin → Home page: the cover images (slides) at the top of the home page.
const AdminHome = () => {
  const toast = useToast();
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHomeContentAPI()
      .then((content) => setState(fromContent(content)))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <Text color='red.500'>{error}</Text>;
  if (!state) return <Spinner color='gray.900' />;

  const { slides, mono, custom } = state;
  const setSlides = (next) => setState((s) => ({ ...s, slides: typeof next === 'function' ? next(s.slides) : next }));
  const update = (i, changes) => setSlides((list) => list.map((s, j) => (j === i ? { ...s, ...changes } : s)));
  const move = (i, step) =>
    setSlides((list) => {
      const next = [...list];
      [next[i], next[i + step]] = [next[i + step], next[i]];
      return next;
    });
  const problems = slides.map(problemsOf);
  const valid = problems.every((p) => p.length === 0);

  const save = async () => {
    setSaving(true);
    try {
      const heroSlides = slides.map(({ image, title, subtitle, cta, link, focus }) => ({
        image,
        title: title.trim(),
        subtitle: subtitle.trim(),
        cta: cta.trim(),
        link: link.trim(),
        focus,
      }));
      setState(fromContent(await saveHomeContentAPI({ heroSlides, heroMono: mono })));
      toast({ title: 'Home page updated', status: 'success', duration: 4000 });
    } catch (err) {
      toast({ title: 'Could not save', description: getErrorMessage(err), status: 'error', duration: 8000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Go back to the starter cover images? Your cover images will be removed from the home page.')) return;
    setSaving(true);
    try {
      setState(fromContent(await resetHomeContentAPI()));
      toast({ title: 'Starter cover images restored', status: 'success', duration: 4000 });
    } catch (err) {
      toast({ title: 'Could not reset', description: getErrorMessage(err), status: 'error', duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box maxW='1100px'>
      <Heading as='h2' size='md' mb={2}>
        Home page cover images
      </Heading>
      <Text color='gray.600' mb={4} maxW='720px'>
        The large photos at the top of the home page. Use photos of your own stock, like a fresh restock or this week&apos;s drop, and point
        each button to the category it shows.
      </Text>
      {!custom && (
        <Alert status='info' borderRadius='md' mb={4}>
          <AlertIcon />
          These are the starter cover images. Change them and save to use your own.
        </Alert>
      )}

      <FormControl display='flex' alignItems='center' mb={5}>
        <Switch
          id='hero-mono'
          colorScheme='brand'
          isChecked={mono}
          onChange={(e) => setState((s) => ({ ...s, mono: e.target.checked }))}
          mr={3}
        />
        <FormLabel htmlFor='hero-mono' mb={0}>
          Show cover images in black and white
        </FormLabel>
      </FormControl>

      <Box display='grid' gap={4}>
        {slides.map((slide, i) => (
          <SlideEditor
            key={slide._key}
            slide={slide}
            index={i}
            count={slides.length}
            mono={mono}
            onChange={(changes) => update(i, changes)}
            onMove={(step) => move(i, step)}
            onRemove={() => setSlides((list) => list.filter((_, j) => j !== i))}
          />
        ))}
      </Box>

      <Button
        mt={4}
        variant='outline'
        onClick={() => setSlides((list) => [...list, blankSlide()])}
        isDisabled={slides.length >= MAX_SLIDES}
      >
        Add cover image
      </Button>
      {slides.length >= MAX_SLIDES && (
        <Text fontSize='sm' color='gray.500' mt={2}>
          Up to {MAX_SLIDES} cover images.
        </Text>
      )}

      {!valid && (
        <Box mt={5} fontSize='sm' color='orange.700'>
          {problems.map((p, i) =>
            p.length ? (
              <Text key={slides[i]._key}>
                Cover image {i + 1}: {p.join(', ')}.
              </Text>
            ) : null
          )}
        </Box>
      )}

      <Flex mt={6} gap={3} wrap='wrap' align='center' borderTop='1px solid #eee' pt={5}>
        <Button colorScheme='brand' onClick={save} isLoading={saving} isDisabled={!valid}>
          Save cover images
        </Button>
        {custom && (
          <Button variant='ghost' onClick={reset} isDisabled={saving}>
            Use the starter cover images
          </Button>
        )}
        <Link as={RouterLink} to='/' ml={{ md: 'auto' }} textDecoration='underline'>
          View home page
        </Link>
      </Flex>
    </Box>
  );
};

export default AdminHome;
