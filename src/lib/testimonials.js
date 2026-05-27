import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { uploadToCloudinary } from './cloudinary.js';

export async function listPublishedTestimonials() {
  const q = query(
    collection(db, 'testimonials'),
    where('isPublished', '==', true),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllTestimonials() {
  const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function submitTestimonial({ userId, authorName, courseId, content, rating, videoFile }) {
  let videoUrl = '';
  if (videoFile) {
    const { url } = await uploadToCloudinary(videoFile, {
      folder: `testimonialMedia/${userId}`,
      resourceType: 'video'
    });
    videoUrl = url;
  }
  const docRef = await addDoc(collection(db, 'testimonials'), {
    userId,
    authorName,
    courseId: courseId || null,
    content,
    rating: rating || 5,
    videoUrl,
    isPublished: false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function setTestimonialPublished(id, isPublished) {
  await updateDoc(doc(db, 'testimonials', id), { isPublished });
}

export async function deleteTestimonial(id) {
  await deleteDoc(doc(db, 'testimonials', id));
}
